const axios = require("axios");

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;

    const response = await axios.post(process.env.FLOWISE_API, {
      question: message,
    });

    res.json({
      reply: response.data.text,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error");
  }
};