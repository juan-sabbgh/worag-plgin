const express = require('express');
const cors = require('cors'); // Asegúrate de tener instalado cors
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// URL para llamar al agente
const url = 'https://agents.dyna.ai/openapi/v1/conversation/dialog/';

// Agent api parameters
const AS_ACCOUNT = process.env.AS_ACCOUNT;
const AGENT_TOKEN_BS_IMG = process.env.AGENT_TOKEN_BS_IMG;
const AGENT_KEY_BS_IMG = process.env.AGENT_KEY_BS_IMG;

const YCLOUD_API = process.env.YCLOUD_API;

app.use(cors());
app.use(express.json());

// Base de datos estática de imágenes (Keys en Mayúsculas para facilitar la búsqueda)
const images_motos = {
    "FRESCO": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769106903443ee6cf-2131-4683-929b-da52ee6b4f96Fresco.png/",
    "CITY": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17691045373f36d799-c1a2-446a-bdbc-699acca05cbcCity-1.jpg/",
    "CITY PRO": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17691049879fcbf05f-a2d5-4fa7-aa55-0ea48d742466City-Pro-1.jpg/",
    "GEEKS": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769106682fffda581-fb9e-4464-9552-50410bad66f0Geeks-1.png/"
};

async function getModelNames(userInput) {
    try {
        const requestData = {
            username: AS_ACCOUNT,
            question: `Modelos: ${userInput}` // Enviamos lo que dijo el usuario para que el agente extraiga las entidades
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'cybertron-robot-key': AGENT_KEY_BS_IMG,
                'cybertron-robot-token': AGENT_TOKEN_BS_IMG
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const rawAnswer = data.data.answer;

        console.log(`Respuesta cruda del agente: ${rawAnswer}`);

        // Limpieza: A veces los LLMs devuelven bloques de código markdown (```json ... ```)
        // Usamos regex para extraer solo el JSON si viene sucio
        let jsonString = rawAnswer;
        const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        try {
            return JSON.parse(jsonString); // Esperamos { "models": ["MODELO1", "MODELO2"] }
        } catch (e) {
            console.error("Error parseando el JSON del agente:", e);
            return { models: [] }; // Retorno seguro en caso de error
        }

    } catch (error) {
        console.error('Error getting chat summary:', error);
        throw error;
    }
}

async function enviarMensajeWhatsApp(number_receiver, image_link, caption_text) {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';

    const headers = {
        'X-API-Key': YCLOUD_API,
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const body = {
        type: "image",
        image: {
            link: image_link,
            caption: caption_text || "Aquí tienes el modelo que pediste 🏍️"
        },
        to: number_receiver,
        from: "+525579435037"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Imagen enviada a ${number_receiver}:`, data);
        return data;

    } catch (error) {
        console.error('❌ Error en la petición de WhatsApp:', error);
        // No lanzamos el error aquí para no detener el bucle si una falla, solo loggeamos
        return null;
    }
}

app.post('/api/return-image-browspot', async (req, res) => {
    const {
        modelos, // Esto es el input del usuario o el nombre del modelo detectado
        function_call_username
    } = req.body;

    // Obtener número del identificador
    const numero = function_call_username.split('--').pop();
    console.log(`Solicitud de imagen para: "${modelos}". Usuario: ${numero}`);

    try {
        // 1. Obtener la lista de modelos desde el Agente (Salida: { "models": ["TIGRE", "CITY"] })
        const agentResult = await getModelNames(modelos);
        
        if (!agentResult.models || agentResult.models.length === 0) {
            console.log("El agente no devolvió modelos válidos.");
            return res.json({
                markdown: "...", // Mensaje invisible para el bot
                type: "markdown",
                desc: "No encontré ese modelo exacto, pero puedes ver todo en @garowmx"
            });
        }

        let imagesSent = 0;

        // 2. Iterar sobre los modelos encontrados y enviar imágenes
        for (const modelName of agentResult.models) {
            // Normalizamos a mayúsculas para buscar en el objeto
            const key = modelName.toUpperCase().trim(); 
            const link = images_motos[key];

            if (link) {
                console.log(`Encontrada imagen para ${key}: ${link}`);
                await enviarMensajeWhatsApp(numero, link, `Modelo: ${key}`);
                imagesSent++;
            } else {
                console.log(`⚠️ No existe imagen configurada para el modelo: ${key}`);
            }
        }

        // 3. Respuesta final al Chatbot
        if (imagesSent > 0) {
            return res.json({
                markdown: "...", // El bot sigue su flujo normal
                type: "markdown",
                desc: "Imágenes enviadas exitosamente"
            });
        } else {
            return res.json({
                markdown: "...",
                type: "markdown",
                desc: "Lo siento, no tengo una foto disponible de ese modelo específico por ahora."
            });
        }

    } catch (error) {
        console.error(error);
        return res.json({
            markdown: "...",
            type: "markdown",
            desc: "Ocurrió un error técnico al buscar la imagen."
        });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});