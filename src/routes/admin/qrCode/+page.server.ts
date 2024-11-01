import { bucket } from '$lib/firebase/firebase';
import { json, fail } from '@sveltejs/kit';
import { uploadFile, generateQRCode } from '$lib/qr-code.js';
import { Actions } from '@sveltejs/kit';

export async function load(event) {
    try {

        const [files] = await bucket.getFiles();

        const fileDetails = await Promise.all(
            files.map(async (file) => {
                const [url] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2025',
                });

                const [metaData] = await file.getMetadata();
                const { surveyLink } = metaData.metadata || {};

                return {
                    name: file.name,
                    url,
                    surveyLink,
                };
            })
        );

        // console.log(fileDetails);
        return {fileDetails};
    } catch (error) {
        console.error('Error fetching files:', error);
        return {fileDetails: []}
    }
}


export const actions: Actions =  {
    uploadSurvey: async ({request}) => {
        console.log("Trying");
        const data = await request.formData();

        const surveyName = data.get('surveyName')?.toString();
        const surveyLink = data.get('surveyLink')?.toString();


        const metaData = {surveyName, surveyLink};
        console.log(metaData);
    
    
        try {
    
            const success = await generateQRCode(surveyLink, "tempQr.png");

            if(!success) {
                return {
                    status: 'error',
                    message: 'Failed to generate QR Code'
                }
            }
    
            const upload = await uploadFile("tempQr.png", `survey-qr/${surveyName}.png`, metaData);

            if(!upload.success) {
                return {
                    status: 'error',
                    message: 'Failed to upload file to storage bucket',
                }
            }

            const url = upload.fileUrl;
    
            return {
    
                    status: 'success',
                    message: 'QR code generated and uploaded successfully',
                    url,
                    name: surveyName,
                    surveyLink
            };
        } catch(error) {
            console.log(error);
            return {
                status: 'error',
                message: 'An error occurred while trying to upload the QR Code to Firebase'
            }
    }
    }
}
