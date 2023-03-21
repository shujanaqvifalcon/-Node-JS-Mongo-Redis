/**
 * User CRUD controllers
 * @author Shuja Naqvi
 */
const Users = require('../models/Users');
const bcrypt = require('bcryptjs');
const bcryptSalt = process.env.BCRYPT_SALT || 10;
const redisClient=require("../redis")
/**
 * Create User - Signup
 * @param {object} req
 * @param {object} res
 */
exports.create = async (req, res) => {
  try {
    let { email, password } = req.body; // Getting required fields from body
    const existingUser = await Users.findOne({ email }); // Finding already existing user

    // Extra Validations
    if (existingUser) {
      // If we found existing user in db
      return res.status(409).json({ success: false, message: 'User already exists.' });
    }

    // Getting url of the image
    if (req.file) {
      req.body.photo = req.file.path; // Creating a new property called photo in body object
    }

    // Creating User
    req.body.password = bcrypt.hashSync(password, parseInt(bcryptSalt)); // Hashing the password with salt 8
    const user = await Users.create(req.body); // Adding user in db
     // Finally, if you got any results, save the data back to the cache
    if (user) {
      try {
        const data={...user._doc}
        //assign the key and store in cache
        const cacheKey = `user:${data._id}`;
        await redisClient.set(cacheKey, JSON.stringify(data));
      } catch (error) {
       return console.error('Something happened to Redis', error.message);
      }
    }
    // Done
    res.json({ success: true, user }); //Success
  } catch (err) {
    // Error handling
    // eslint-disable-next-line no-console
    console.log('Error ----> ', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get all users
 * @param {object} req
 * @param {object} res
 */
exports.getAll = async (req, res) => {
  try {
    const users = await Users.find(); // Finding all the users from db
    res.json({ success: true, users }); // Success
  } catch (err) {
    // Error handling
    // eslint-disable-next-line no-console
    console.log('Error ----> ', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get user by id
 * @param {object} req
 * @param {object} res
 */
exports.getById = async (req, res) => {
  try {
    const userId = req.params.userId; // Getting user id from URL parameter
    const cacheKey = `user:${userId}`;
     try{
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) {
        return res.json({ success: true, user : JSON.parse(cachedResult) }); // Success
       }
     }
     catch(err){
      console.log("Something went wrong with redis",err.message)
     }
    const user = await Users.findById(userId); // Finding user by id
    res.json({ success: true, user}); // Success
  } catch (err) {
    // Error handling
    // eslint-disable-next-line no-console
    console.log('Error ----> ', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update user
 * @param {object} req
 * @param {object} res
 */
exports.update = async (req, res) => {
  try {
    const userId = req.params.userId; // Getting user id from URL parameter

    // If user want to update it's password
    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, parseInt(bcryptSalt));
    }
    const user = await Users.findByIdAndUpdate(userId, req.body, { new: true }); // Updating the user
    if(user){
      try {
        const data={...user._doc}
        //assign the key and update user from cache
        const cacheKey = `user:${data._id}`;
        await redisClient.set(cacheKey, JSON.stringify(data));
      } 
      catch(error) {
        return console.error('Something happened to Redis', error.message);
      }
    }
    res.json({ success: true, user }); // Success
  } catch (err) {
    // Error handling
    // eslint-disable-next-line no-console
    console.log('Error ----> ', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Delete user
 * @param {object} req
 * @param {object} res
 */
exports.delete = async (req, res) => {
  try {
    const userId = req.params.userId; // Getting user id from URL parameter
    const user = await Users.findByIdAndDelete(userId); // Deleting the user
    if(user){
      try{
        //assign the key and del from cache
        await redisClient.del(`user:${userId}`)
      }
      catch(err){
        console.log("Something went wrong with redis",err.message)
      }
    }
    res.json({ success: true, user }); // Success
  } catch (err) {
    // Error handling
    // eslint-disable-next-line no-console
    console.log('Error ----> ', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
