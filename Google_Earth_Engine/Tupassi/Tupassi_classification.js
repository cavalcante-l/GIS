/*----------
  Made by: Laiza Cavalcante de Albuquerque Silva and Willyan Becker
  Owner: Laiza Cavalcante de Albuquerque Silva
  Please, reference it if was useful
  Thank you!
  Last edit: 13/07/18
  Code on GEE: https://code.earthengine.google.com/2023554109b39c12d6396c0a7f3ccb5d
------------*/

//------ Sentinel 2

var DataInicio = '2016-12-01';
var DataFim = '2017-01-30';
var MaxNuvem = 50;

// Look for Sentinel image without cloud
var Tupassi_Scene = imageCollection2
  .filterDate('2016-12-01', '2017-02-10')
  .filterMetadata('CLOUD_COVERAGE_ASSESSMENT', 'less_than', MaxNuvem)
  .filterBounds(table);
print(Tupassi_Scene.toList(100));

// Median and Clip
var Tupassi_Clip = Tupassi_Scene.median().clip(table);

//RGB  
Map.addLayer(Tupassi_Clip.select(['B8', 'B11', 'B4']), { min: 555, max: 3270 }, 'Tupassi Sentinel RGB', false);

//------ INDEX
// NDVI 
var NDVI = Tupassi_Clip.normalizedDifference(['B8', 'B4']).rename('NDVI');
//Map.addLayer(NDVI,{min:-1,max:1,palette:['red','white','green']},'Tupassi_Scene NDVI');
//Map.centerObject(table,11);

var Tupassi_classbands = Tupassi_Clip.select(['B2', 'B3', 'B4', 'B8', 'B11']);
var Tupassi_classbands_NDVI = Tupassi_classbands.addBands(NDVI);

// SAVI
var SAVI = Tupassi_classbands_NDVI.expression(
  '((NIR - RED) / (NIR + RED + L))* (1+L)', {
  'NIR': Tupassi_classbands_NDVI.select('B8'),
  'RED': Tupassi_classbands_NDVI.select('B4'),
  'L': 0.1,
}).rename('SAVI');

// ARVI
var ARVI = Tupassi_classbands_NDVI.expression(
  '(B8 - ((2*B4) - B2)/ (B8 + (2*B4)-B2))', {
  'B8': Tupassi_classbands_NDVI.select('B8'),
  'B4': Tupassi_classbands_NDVI.select('B4'),
  'B2': Tupassi_classbands_NDVI.select('B2'),
}).rename('ARVI');

// GRV1
var GRV1 = Tupassi_classbands_NDVI.expression(
  '(B4 - B3)/(B4 + B3)', {
  'B4': Tupassi_classbands_NDVI.select('B4'),
  'B3': Tupassi_classbands_NDVI.select('B3'),
}).rename('GRV1');

var Tupassi_classbands_INDEX = Tupassi_classbands_NDVI.addBands(SAVI).addBands(ARVI).addBands(GRV1);
print('Bands and Idexes S2', Tupassi_classbands_INDEX);


//------  Landsat 8 WITHOUT CLOUD

var DataInicio2 = '2016-11-01';
var DataFim2 = '2017-02-20';
var MaxNuvem2 = 10;

var Tupassi_Scene2 = imageCollection.filterDate(DataInicio2, DataFim2)
  .filterMetadata('CLOUD_COVER', 'less_than', MaxNuvem2)
  .filterBounds(table);
print(Tupassi_Scene2.toList(100));

// Filter images only in area of interest
var Filtro = Tupassi_Scene2.map(function (image) {
  var Nuvem = ee.Algorithms.Landsat.simpleCloudScore(image).select('cloud');
  var Nuvens = Nuvem.reduceRegion({
    reducer: 'mean',
    geometry: table,
    scale: 30,
  });
  return image.set(Nuvens);
});

// Applying the filter
var Tupassi_Scene3 = Filtro.filter(ee.Filter.lt('cloud', 70));

// Function to remove cloud
var cloud_thresh = 70;
var maskClouds = function (image) {
  var cloudScore = ee.Algorithms.Landsat.simpleCloudScore(image);
  var cloudLikelihood = cloudScore.select('cloud');
  var cloudPixels = cloudLikelihood.lt(cloud_thresh);
  return image.updateMask(cloudPixels);
};

// Clip cloud
var getQABits = function (image, start, end, newName) {
  // Computa os bits para extrair
  var pattern = 0;
  for (var i = start; i <= end; i++) {
    pattern += Math.pow(2, i);
  }
  return image.select([0], [newName])
    .bitwiseAnd(pattern)
    .rightShift(start);
};

// Função para retirar os pixeis com sombra de nuvens
var cloud_shadows = function (image) {
  var QA = image.select(['BQA']);
  return getQABits(QA, 7, 8, 'Cloud_shadows').eq(1);
};

// Função para retirar os pixeis com nuvens
var clouds = function (image) {
  var QA = image.select(['BQA']);
  return getQABits(QA, 4, 4, 'Cloud').eq(0);
};
var remove_clouds = function (image) {
  var cs = cloud_shadows(image);
  var c = clouds(image);
  image = image.updateMask(cs);
  return image.updateMask(c);
};

var L8_Free_Cloud = Tupassi_Scene3.map(remove_clouds);

// Median and clip
var Tupassi_Clip2 = L8_Free_Cloud.map(maskClouds).median().clip(table);

// RGB
Map.addLayer(Tupassi_Clip2.select(['B5', 'B6', 'B4']), { min: 0, max: 0.5 }, 'Tupassi Landsat FalseColor');

//------ INDEX 
// NDVI
var NDVI = Tupassi_Clip2.normalizedDifference(['B5', 'B4']).rename('NDVI');
//Map.addLayer(NDVI,{min:-1,max:1,palette:['red','white','green']},'Tupassi_Scene NDVI');
//Map.centerObject(table,11);

var Tupassi_classbands2 = Tupassi_Clip2.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
var Tupassi_classbands2_NDVI = Tupassi_classbands2.addBands(NDVI);

// SAVI
var SAVI = Tupassi_classbands2_NDVI.expression(
  '((NIR - RED) / (NIR + RED + L))* (1+L)', {
  'NIR': Tupassi_classbands2_NDVI.select('B5'),
  'RED': Tupassi_classbands2_NDVI.select('B4'),
  'L': 0.5,
}).rename('SAVI');

// NSDI - Normalized Soil Difference Index
var NSDI = Tupassi_classbands2_NDVI.expression(
  '((SWIR_TWO - BLUE) / (SWIR_TWO + BLUE))', {
  'SWIR_TWO': Tupassi_classbands2_NDVI.select('B7'),
  'BLUE': Tupassi_classbands2_NDVI.select('B2'),
}).rename('NSDI').float();


// Advanced Vegetation Index (AVI):
var AVI = Tupassi_classbands2_NDVI.expression(
  '((B5+1)*(256-B4)*(B5-B4))*1/3', {
  'B5': Tupassi_classbands2_NDVI.select('B5'),
  'B4': Tupassi_classbands2_NDVI.select('B4'),
}).rename('AVI').float();

// EVI 2 - Enhanced Vegetation Index 2
var EVI2 = Tupassi_classbands2_NDVI.expression(
  '((B5- B4)/(B5+1+(2.4*B4)))', {
  'B5': Tupassi_classbands2_NDVI.select('B5'),
  'B4': Tupassi_classbands2_NDVI.select('B4')
}).rename('EVI2').float();

// Adding bands
var Tupassi_classbands2_INDEX = Tupassi_classbands2_NDVI
  .addBands(SAVI)
  .addBands(NSDI)
  .addBands(EVI2);
print(Tupassi_classbands2_INDEX);

Map.addLayer(Tupassi_classbands2_INDEX.select('SAVI'), {}, 'savi', false);
Map.addLayer(Tupassi_classbands2_INDEX.select('NDVI'), { min: -1, max: 1 }, 'ndvi', false);
//Map.addLayer(Tupassi_classbands2_INDEX.select('AVI'), {min:0, max:1}, 'avi');


//---------- CLASSIFICATION WITHOUT CLOUD
//---- Non-supervisioned     

// KMeans - calculating for Landsat 8
var training_NS = Tupassi_classbands2_INDEX.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'NDVI', 'SAVI', 'NSDI', 'EVI2'])
  .sample({
    region: table,
    scale: 30,
    numPixels: 500, //lower numPixels = lower classes
    seed: 100,
  });

// Instantiate the clusterer and train it.
// K-Means
// Tentar classes acima de 20
var clusterer_NS = ee.Clusterer.wekaKMeans({
  nClusters: 15, init: 1, canopies: false, maxCandidates: 200,
  periodicPruning: 10000, minDensity: 2, t1: -1, t2: -1.5,
  seed: 100
})
  .train(training_NS);

// XMeans
var teste = ee.Clusterer.wekaXMeans({
  minClusters: 15, maxClusters: 20, maxKMeans: 1000, useKD: false, seed: 100
})
  .train(training_NS);

//Cascade KMeans
var clusterer_2 = ee.Clusterer.wekaCascadeKMeans({
  minClusters: 15, maxClusters: 20
})
  .train(training_NS);


// LVQ -  learning vector quantization
// Aditional information: https://link.springer.com/article/10.1007%2Fs00521-013-1535-3
// However, LVQ can also be trained without labels by unsupervised learning for clustering purposes 
var lvq = ee.Clusterer.wekaLVQ({
  numClusters: 15, learningRate: 1, epochs: 10
}).train(training_NS);

//INFORMATION ABOUT TESTS:
//Kmeans is similar to XMeans, Cascade provide better results in this configurations:
//minClusters:3,maxClusters: 10}), maybe working in it could improve results

// Cluster the input using the trained clusterer.
var result_NS = Tupassi_classbands2_INDEX.cluster(clusterer_NS);
var result_2 = Tupassi_classbands2_INDEX.cluster(clusterer_2);
var teste2 = Tupassi_classbands2_INDEX.cluster(teste);
var teste3 = Tupassi_classbands2_INDEX.cluster(lvq);

// Display the clusters with random colors. - How I customize it?
Map.addLayer(result_NS.randomVisualizer(), {}, 'Clusters KMeans L8', false);
Map.addLayer(result_2.randomVisualizer(), {}, 'Clusters Cascade KMeans L8', false);
Map.addLayer(teste2.randomVisualizer(), {}, 'Cluster XMeans L8', false);
Map.addLayer(teste3.randomVisualizer(), {}, 'Cluster LVQ L8', false);

//---- Supervisioned
var newfc = MataNativa.merge(Cidade).merge(Agua).merge(Soja).merge(Milho);
var classProperty = 'class';

// Landsat-8
var training = Tupassi_classbands2_INDEX.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'NDVI', 'NSDI', 'SAVI', 'EVI2']).sampleRegions({
  collection: newfc,
  properties: [classProperty],
  scale: 30
});

// Lambda>0 - better classification, save some tests and evaluate before.
var classifier = ee.Classifier.continuousNaiveBayes({ lambda: 10 }).train({
  features: training,
  classProperty: classProperty,
});
print('continuous NaiveBayes L8, explained', classifier.explain());

// Accuracy
var confMatrix = classifier.confusionMatrix()
var OA = confMatrix.accuracy()
var CA = confMatrix.consumersAccuracy()
var Kappa = confMatrix.kappa()
var Order = confMatrix.order()
var PA = confMatrix.producersAccuracy()

print(OA, 'Overall Accuracy')
print(Kappa, 'Kappa')
print(Order, 'Order')
print(PA, 'Producers Accuracy')

var classified = Tupassi_classbands2_INDEX.classify(classifier);
Map.addLayer(classified, { min: 1, max: 5, palette: ['green', 'cyan', 'red', 'blue', 'yellow'] }, 'Classificação continuousNaiveBayes', false);

// Export the image, specifying scale and region.
/*
Export.table.toDrive({
  collection: table,
  description: 'Tupassi_vector',
  fileFormat: 'SHP'
});
*/