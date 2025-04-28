require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));

const cache = {};
const API_KEY = process.env.OMDB_API_KEY;

const CACHE_DURATION = 10 * 60 * 1000;

const isTesting = process.env.NODE_ENV === 'test';

app.get('/', async (req, res) => {
  const movieId = req.query.i;
  const movieTitle = req.query.t;

  if (!movieId && !movieTitle) {
    return res.status(400).json({ error: 'Movie ID (i) or Title (t) is required' });
  }

  const cacheKey = movieId || movieTitle;
  const now = Date.now();

  const cachedEntry = cache[cacheKey];

  if (cachedEntry) {
    if (isTesting || (now - cachedEntry.timestamp) < CACHE_DURATION) {
      console.log('Serving from cache:', cacheKey);
      return res.status(200).json(cachedEntry.data);
    }
  }

  try {
    let omdbUrl = `http://www.omdbapi.com/?apikey=${API_KEY}`;
    if (movieId) {
      omdbUrl += `&i=${movieId}`;
    } else if (movieTitle) {
      omdbUrl += `&t=${encodeURIComponent(movieTitle)}`;
    }

    const response = await axios.get(omdbUrl);
    const movieData = response.data;

    if (movieData.Response === 'False') {
      return res.status(404).json({ error: 'Movie not found' });
    }

    cache[cacheKey] = {
      data: movieData,
      timestamp: now
    };

    console.log('Fetched from OMDb and cached:', cacheKey);
    return res.status(200).json(movieData);

  } catch (error) {
    console.error('Error fetching movie data:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/clear-cache', (req, res) => {
  for (let key in cache) {
    delete cache[key];
  }
  res.status(200).json({ message: 'Cache cleared!' });
});

module.exports = app;