/**
 * Executes Federated Averaging (FedAvg) on a collection of client model weights.
 * @param {Array<Array<Float32Array>>} clientWeightsList - Array of clients, containing arrays of layer weights.
 * @returns {Array<Float32Array>} The averaged global model weights.
 */
export const performFedAvg = (clientWeightsList) => {
  if (!clientWeightsList || clientWeightsList.length === 0) return null;

  // Socket payloads may contain normal arrays, typed arrays, or object-like numeric maps.
  const normalized = clientWeightsList.map((layers) =>
    layers.map((layer) => {
      if (Array.isArray(layer)) return Float32Array.from(layer);
      if (ArrayBuffer.isView(layer)) return Float32Array.from(layer);
      return Float32Array.from(Object.values(layer));
    })
  );

  const numClients = normalized.length;
  const numLayers = normalized[0].length;
  const averagedWeights = [];

  // Iterate through each layer of the neural network
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
    const layerSize = normalized[0][layerIdx].length;
    const layerSum = new Float32Array(layerSize);

    // Iterate through every single weight parameter in that layer
    for (let i = 0; i < layerSize; i++) {
      let sum = 0;
      // Sum the values from all clients for this specific parameter
      for (let clientIdx = 0; clientIdx < numClients; clientIdx++) {
        sum += normalized[clientIdx][layerIdx][i];
      }
      // Calculate the mean
      layerSum[i] = sum / numClients;
    }
    
    averagedWeights.push(layerSum);
  }

  console.log(`Successfully averaged ${numLayers} layers across ${numClients} clients.`);
  return averagedWeights;
};