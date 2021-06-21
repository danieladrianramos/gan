const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const protocol = 'http';
const host = '127.0.0.1';
const port = '8080';
const server = `${protocol}://${host}:${port}`;


// DB
const fs = require('fs');
const data = fs.readFileSync('addresses.json');
const db = JSON.parse(data);


// OTHERS
const haversineCalculator = require('haversine-calculator')
const http = require('http');


const router = express.Router();

// MIDDLEWARE
router.use(function(req, res, next) {
	if (!req.headers.authorization) {
		return res.status(401).json({ error: 'No credentials sent!' });
	}

	next();
});


// ROUTES
router.get('/cities-by-tag', function(req, res) {
	const tag = req.query.tag;
	const isActive = (req.query.isActive === "true") ? true : false;

	const result = db.filter((address) => {
		return address.tags.includes(tag)
			&& address.isActive === isActive;
	});

	res.json({
		cities: result
	});
});


router.get('/distance', function(req, res) {
	const from = db.find((address) => address.guid === req.query.from);
	const to = db.find((address) => address.guid === req.query.to);

	const distance = haversineCalculator(from, to, { unit: 'km' });

	res.json({
		from: from,
		to: to,
		unit: 'km',
		distance: Math.round(distance * 100) / 100
	});	
});


router.get('/area', function(req, res) {
	res.status(202).json({
		resultsUrl: `${server}/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428`
	});	

	const from = db.find((address) => address.guid === req.query.from);

	let distance;

	const distances = db.map((address) => {
		distance = haversineCalculator(from, address, { unit: 'km' });

		address['unit'] = 'km';
		address['distance'] = Math.round(distance * 100) / 100;

		return address;
	});

	const response = distances.filter((address) => {
		return address.distance > 0
			&& address.distance <= req.query.distance
	});

	fs.writeFile('area-result.json', JSON.stringify(response), 'utf8', function (err) {
		if (err) {
			return console.log(err);
		}

		console.log('area-result.json done!!');
	});
});


router.get('/area-result/:id', function(req, res) {
	const data = fs.readFileSync('area-result.json');

	res.status(200).json({
		cities: JSON.parse(data)
	});
});


router.get('/all-cities', function(req, res) {
	const filename = 'addresses.json';

	res.download('./' + filename, filename, (err) => {
		if (err) {
			res.status(500).send({
				message: "Could not download the file. " + err,
			});
		}
	});
});


app.use('/', router);
app.listen(port);

console.log('Server on port ' + port);
