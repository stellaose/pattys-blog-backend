import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config();

export default {
    /**
     * Your favorite port
     */
    port: parseInt(process.env.PORT),


        
  

    /**
     * Used by winston logger
     */
    logs: {
        level: process.env.LOG_LEVEL || 'silly'
    },

    
    jwtSecret: 'xxxxxxxxxxxx' || process.env.JWT_SECRET,
    jwtAlgorithm: 'HS256' || process.env.JWT_ALGORITHM,
    jwtExpiresIn: '1d' || process.env.JWT_EXPIRES_IN,
    refreshJwtSecret: 'xxxxxxxxxxxx' || process.env.REFRESH_JWT_SECRET,
    refreshJwtExpiresIn: '100d' || process.env.REFRESH_JWT_EXPIRES_IN,
    emailSecret: 'xxxxxxxxxxxx' || process.env.EMAIL_SECRET,

    /**
     * API configs
     */
    api: {
        prefix: '/api/v1'
    },
};