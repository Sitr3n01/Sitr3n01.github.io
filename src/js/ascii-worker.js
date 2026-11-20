// Amostra pontos fora da thread que anima a página. As poses continuam no palco.
self.onmessage = async ({ data: { id, name, N, params, state } }) => {
  try {
    const rng = rngFrom(state);
    const cloud = await ASC_SAMPLERS[name](N, rng.random, params);
    self.postMessage({ id, cloud, state: rng.state }, Object.values(cloud).map(values => values.buffer));
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
