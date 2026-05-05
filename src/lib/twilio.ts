import twilio from "twilio";



const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const client = twilio(accountSid, authToken);


export const sendWhatsappMessage = async (to:string,body:string) => {
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: "whatsapp:" + to,
    body: body.trim(),
  });
}