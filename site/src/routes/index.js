const router = require('express').Router();

router.use('/', (req, res) => {
	res.render('index.pug');
});

module.exports = router;