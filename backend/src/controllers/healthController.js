export const healthController = {
  get(req, res) {
    res.status(200).json({ ok: true });
  },
};
