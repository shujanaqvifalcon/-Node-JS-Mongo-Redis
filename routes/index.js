/**
 * All api routes handles here
 * @author Shuja Naqvi
 */
const router = require('express').Router();

// Parent Routes
router.use('/users', require('./users')); // All the user routes

// Export
module.exports = router;
