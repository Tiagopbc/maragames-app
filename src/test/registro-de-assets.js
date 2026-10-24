// O jest-expo 58.0.12 simula o registro de assets só em `react-native/asset-registry`, mas o
// expo-asset, desde a 58.0.16, lê o `AssetRegistry` exportado pelo próprio `react-native`, que
// fica de fora do simulado. Sem isto, todo ícone de @expo/vector-icons quebra o teste com
// 'Module "1" is missing from the asset registry'. Aqui o registro público passa a responder
// com o mesmo simulado. Quando o jest-expo simular o registro público, este arquivo sai.
const { AssetRegistry } = require('react-native');
const simulado = require('react-native/asset-registry');

AssetRegistry.registerAsset = simulado.registerAsset;
AssetRegistry.getAssetByID = simulado.getAssetByID;
