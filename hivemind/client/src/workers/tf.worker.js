import * as tf from '@tensorflow/tfjs';

let model;

const initModel = () => {
  // A simple but effective dense network for demonstration (e.g., MNIST digit classification)
  model = tf.sequential();
  model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [784] }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
  model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  console.log("Worker: TF.js Model Initialized");
};

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    initModel();
    self.postMessage({ type: 'READY' });
  }

  if (type === 'TRAIN') {
    if (!model) initModel();
    
    // 1. Sync with the Server's Global Weights (if any exist)
    if (payload.globalWeights) {
      const weightTensors = payload.globalWeights.map(w => tf.tensor(w));
      model.setWeights(weightTensors);
    }

    // 2. Generate/Load local training data
    // For the hackathon demo, we generate random dummy tensors. 
    // In production, you'd load actual user data chunks here.
    const xs = tf.randomNormal([64, 784]); // 64 samples
    const ys = tf.oneHot(tf.randomUniform([64], 0, 9, 'int32'), 10);

    // 3. Train the model and fire events to the UI
    await model.fit(xs, ys, {
      epochs: 2,
      batchSize: 16,
      callbacks: {
        onBatchEnd: async (batch, logs) => {
          // Tell the UI to fire the laser!
          self.postMessage({ type: 'BATCH_END', batch, loss: logs.loss });
        }
      }
    });

    // 4. Extract the newly trained weights as flat binary arrays
    const newWeights = model.getWeights();
    const weightArrays = await Promise.all(newWeights.map(t => t.data()));
    
    // 5. Send back to main thread to be broadcasted via Socket.io
    self.postMessage({ type: 'TRAIN_COMPLETE', weights: weightArrays });
    
    // Prevent memory leaks on the GPU
    xs.dispose();
    ys.dispose();
  }
};