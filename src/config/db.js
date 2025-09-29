import mongoose from "mongoose";

const connectDb = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)

        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`error connecting to the Db` , error)
        process.exit()
    }
}


export default connectDb;