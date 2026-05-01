export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { telefono, mensaje } = req.body;

    if (!telefono || !mensaje) {
        return res.status(400).json({ error: 'Faltan campos: telefono, mensaje' });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        return res.status(500).json({ error: 'WhatsApp API no configurada' });
    }

    // Limpiar numero: solo digitos
    const numero = telefono.replace(/[^0-9]/g, '');

    try {
        const response = await fetch(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: numero,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: mensaje,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'Error al enviar mensaje',
                details: data
            });
        }

        return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });
    } catch (error) {
        console.error('Error enviando WhatsApp:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
}
