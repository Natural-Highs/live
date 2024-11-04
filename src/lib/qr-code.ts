import qrcode from "qrcode";
import { bucket } from "./firebase/firebase";


type MetaDataType = {
    surveyName: string,
    surveyLink: string,

}

export const uploadFile = async (filePath: string, destination: string, metaData: MetaDataType) => {
    try {
        const [file] = await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: "image/png",
                metadata: {
                    name: metaData.surveyName,
                    surveyLink: metaData.surveyLink
                }
            }
        })

        const fileId = file.id;
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2025', // Adjust this expiration date as needed
        });


        return {
            success: true,
            fileUrl: url,
            message: 'Image uploaded successfully',
            fileId
        };


    } catch(error) {
        console.log(error);
        return {
            success: false,
            message: 'Failed to upload the image',
        };
    }
}


export const generateQRCode = async (url: string, filePath: string) => {
    try {
        await qrcode.toFile(filePath, url);
        return true;
    } catch(error) {
        console.log(error);
        return false;
    }
}


export const deleteQRCode = async(surveyLink: string) => {
    try {
        await bucket.file(surveyLink).delete();
        return true;
    } catch(error) {
        console.log(error);
        return false;
    }
}