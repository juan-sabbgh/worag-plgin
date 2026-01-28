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
const NUMBER_YCLOUD = process.env.NUMBER_YCLOUD;

app.use(cors());
app.use(express.json());

// Base de datos estática de imágenes (Keys en Mayúsculas para facilitar la búsqueda)
const images_motos = {
    "FRESCO": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769106903443ee6cf-2131-4683-929b-da52ee6b4f96Fresco.png/",
    "CITY": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17691045373f36d799-c1a2-446a-bdbc-699acca05cbcCity-1.jpg/",
    "CITY PRO": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17691049879fcbf05f-a2d5-4fa7-aa55-0ea48d742466City-Pro-1.jpg/",
    "GEEKS": "https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769106682fffda581-fb9e-4464-9552-50410bad66f0Geeks-1.png/",
    "G3":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769448876c304cfaf-5d83-4159-b4b1-4fad82505feaimage13.png/",
    "V6":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/176944929489053c47-b3a1-41b8-aac5-e317747e7e67image6.png",
    "DL":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769450101a67641bc-51eb-4bc6-a571-433e83b1a8a8DL.png",
    "SF / CIELO":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17694503984fbc63f5-74ab-48ae-abc7-c57639d63caasfcieo.jpg",
    "CL / SY":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769450997c158e115-8788-4a8b-b69e-148d6135f54eimage20.png",
    "LUNA":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769451127b3564252-18a1-4624-b4b1-ee17d9700afcLuna-1.png",
    "VIENTO":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769451691ee0cef58-fde9-475a-8f70-9c41db8824b4Viento-1.jpg",
    "KINGKONG":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/176945173605789dc0-85b6-4d22-8681-d94fbeceffebking-kong-1.jpg",
    "VUELO 180":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769451895ae4845f8-9422-4277-9d9b-e9cc6029f4f6Vuelo-180-1.png",
    "X TIGRE / FS700":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769453022db2256d1-0f58-45e2-a3a1-e823e1220b95image27.png",
    "TIGRE":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17694535345b0fbb60-ab87-4bd9-b8c2-e436348c0d50image5.png",
    "MX 16":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769453773381f9812-1c6a-4561-8f83-cf58617ddc27MX-16-1.jpg",
    "MX 17":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769454452c8afec6c-c7d3-4e99-be8f-13267689b8d6MX17-2.jpg",
    "MX 18":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/1769454516a66a2126-554f-4146-aae0-9ec43ea76a34image36.png",
    "MX 19":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/17694547867eae79d3-cbce-49ad-be02-5c5f22cc9553image40.png",
    "MX 20":"https://agents.dyna.ai/api/app/cybertron/knowledge_file/image/knowledge/qa_img/176945501345e2f455-4894-463d-bb4a-f24058a3f29aimage47.jpg"
};

async function getModelNames(userInput) {
    try {
        const requestData = {
            username: AS_ACCOUNT,
            question: `Modelos: ${userInput}`
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

        console.log(`Respuesta cruda del agente: ${JSON.stringify(rawAnswer)}`); // Usamos JSON.stringify para ver caracteres ocultos en el log

        // 1. Extracción con Regex (Busca el primer '{' y el último '}')
        let jsonString = rawAnswer;
        const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        // 2. SANITIZACIÓN (EL FIX CLAVE)
        // Reemplaza Non-Breaking Spaces (\u00A0) y otros espacios raros por espacios normales
        // Tambien elimina posibles saltos de linea mal formados si los hubiera
        jsonString = jsonString.replace(/[\u00A0\u1680\u180e\u2000-\u2009\u200a\u202f\u205f\u3000]/g, ' ');

        try {
            return JSON.parse(jsonString); 
        } catch (e) {
            console.error("Error parseando el JSON saneado:", e);
            console.error("String que falló:", jsonString);
            return { models: [] }; 
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
        from: `+52${NUMBER_YCLOUD}`
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

app.post('/api/return-image-garow', async (req, res) => {
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
                desc: "😎 En foto se ve increíble, pero te soy honesto: ninguna imagen le hace justicia al tamaño real y a la calidad de los materiales. Tienes que venir a la sucursal a sentirla tú mismo. ¿Te animas o prefieres ver otros modelos?"
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