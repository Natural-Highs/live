// import { createClient } from "redis";

// const redisClient = createClient({
//     username: 'default',
//     password: import.meta.env.REDIS_PASSWORD,
//     socket: {
//         host: import.meta.env.REDIS_HOST,
//         port: 19828
//     }
// });


// if(!redisClient.isOpen) {
//     await redisClient.connect();
// }

// redisClient.on('error', (err) => console.log('Redis Client Error', err));

// // await client.set('foo', 'bar');
// // const result = await client.get('foo');

// export {redisClient};

