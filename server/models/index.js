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
     * Sendgrid
     */
    // sendGrid: {
    //     apiKey:
    //     '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',
    //     email: 'hello@haraka.ai',
    //     templateIds: {
    //       passwordReset: 'd-be3056d93940441a9608dad7e92d5fe7'
    //     }
    // },

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