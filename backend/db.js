import mongoose from "mongoose";
import dotenv from "dotenv"
import colors from "colors"
dotenv.config()


export const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGO_URI)
        if(connect) {
            console.log("database connected successfully, work smartly!".green.bold)
        } else{
            console.log("An error occurred")
        }
    } catch (error) {
        console.log(error)
    }
}