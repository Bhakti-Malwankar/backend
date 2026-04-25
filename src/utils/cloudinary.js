import {v2 as cloudinary } from 'cloudinary';
import fs from 'fs';//file system of nodejs helps in read,write file operations

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary=async (filePath, folder)=>{
    try {
        if(!filePath) throw new Error("File path is required");
        //upload the file on cloudinary
        const result = await cloudinary.uploader.upload(filePath,
        {
            resource_type:"auto", //automatically detect the file type

        })
        //file has been uploaded successfully
        //console.log("File uploaded successfully: ", result.url);
        fs.unlinkSync(filePath); //delete the file from local storage
        return result;
    }
    catch (error) {
        fs.unlinkSync(filePath); //delete the file from local storage
        return null;
    }
}

const deleteFromCloudinary=async (publicId)=>{
    try {
        if(!publicId) return null;
        return await cloudinary.uploader.destroy(publicId);
    }
    catch (error) {
        return null;
    }
}

export {uploadToCloudinary, deleteFromCloudinary};
