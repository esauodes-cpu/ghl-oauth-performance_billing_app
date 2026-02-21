export default async function handler(req, res) {
  try {
    // Parámetros que GHL enviará al redirect
    const { code, state, error, error_description } = req.query || {};

    // Si el usuario canceló o hubo error en OAuth
    if (error) {
      return res.status(400).json({
        ok: false,
        error,
        error_description: error_description || null,
      });
    }

    // Si no hay code, el endpoint fue llamado manualmente
    if (!code) {
      return res.status(400).json({
        ok: false,
        message: "Missing required query param: code",
      });
    }

    // ✔️ Confirmamos que el callback funciona
    return res.status(200).json({
      ok: true,
      message: "OAuth callback received successfully",
      code_received: true,
      state: state || null,
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
}
