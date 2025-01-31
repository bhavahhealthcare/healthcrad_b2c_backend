import axios, { AxiosError } from "axios";
import querystring from "querystring";

const sendOTP = async ({
  message,
  phoneNumber,
  isTest = "true",
}: {
  message: string;
  phoneNumber: string;
  isTest: string;
}) => {
  try {
    // Api credentials...
    const userName = process.env.USERNAME;
    const hash = process.env.HASH;
    const sender = process.env.SENDER;

    const encodedMessage = encodeURIComponent(message);

    const data = querystring.stringify({
      username: userName,
      hash: hash,
      message: encodedMessage,
      sender: sender,
      numbers: phoneNumber,
      test: isTest,
    });

    // make Api call...
    const axiosResonse = await axios.post("https://api.textlocal.in/send/", data);
    if(axiosResonse) {
        return "success"
    }
  } catch (error) {
    if(error instanceof AxiosError) {
        console.error(error);
        throw new Error("axios erros while sending OTP!")
    } else {
        console.error(error)
        throw new Error("Unknown error while sending OTP!")
    }
  }
};


export { sendOTP }
