const OPENWEATHER_API_KEY = '131c9fa3c797663b83d370c0cd2efcbf';
const GEMINI_API_KEY = 'AIzaSyBDEnCl3DLwqXqhJUmoOzeOtCuCsIeYvXY';

let currentWeatherData = null;
let forecastData = null;
let temperatureUnit = 'metric';
let lastSearchedCity = '';

document.getElementById('searchBtn').addEventListener('click', getWeather);
document.getElementById('sendBtn').addEventListener('click', sendChatMessage);
document.getElementById('unitToggle').addEventListener('click', toggleTemperatureUnit);

// Add event listeners for navigation
document.querySelector('nav a[href="#dashboard"]').addEventListener('click', showDashboard);
document.querySelector('nav a[href="#tables"]').addEventListener('click', showTables);

// Add event listeners for filters
document.getElementById('sortAsc').addEventListener('click', () => sortTemperatures('asc'));
document.getElementById('sortDesc').addEventListener('click', () => sortTemperatures('desc'));
document.getElementById('filterRain').addEventListener('click', filterRainyDays);
document.getElementById('highestTemp').addEventListener('click', showHighestTemperature);

// Call this function when the page loads
window.addEventListener('load', getLocationAndWeather);

function displayError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);

    // Remove the error message after 3 seconds
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.remove();
        }
    }, 3000);
}

function showDashboard(e) {
    e.preventDefault();
    document.getElementById('dashboard').classList.add('active');
    document.getElementById('tables').classList.remove('active');
}

function showTables(e) {
    e.preventDefault();
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('tables').classList.add('active');
}

function showSpinner() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideSpinner() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function getLocationAndWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherByCoords(lat, lon);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please enable location services or enter a city manually.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable. Please enter a city manually.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again or enter a city manually.";
                        break;
                    default:
                        errorMessage = "Unable to retrieve your location. Please enter a city manually.";
                }
                displayError(errorMessage);
            }
        );
    } else {
        displayError("Geolocation is not supported by your browser. Please enter a city manually.");
    }
}


async function getWeatherByCoords(lat, lon) {
    showSpinner();
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${temperatureUnit}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${temperatureUnit}`;

    try {
        const [currentWeatherResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        if (!currentWeatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Unable to fetch weather data');
        }

        currentWeatherData = await currentWeatherResponse.json();
        forecastData = await forecastResponse.json();

        displayCurrentWeather(currentWeatherData);
        displayForecast(forecastData);
        createCharts(forecastData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError(error.message);
    } finally {
        hideSpinner();
    }
}

async function getWeather() {
    showSpinner();
    const city = document.getElementById('cityInput').value.trim();

    if (!city) {
        hideSpinner();
        displayError('Please enter a city name');
        return;
    }

    if (city.length < 2) {
        hideSpinner();
        displayError('City name must be at least 2 characters long');
        return;
    }

    try {
        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=${temperatureUnit}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHER_API_KEY}&units=${temperatureUnit}`;

        const [currentWeatherResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        if (!currentWeatherResponse.ok || !forecastResponse.ok) {
            if (currentWeatherResponse.status === 404 || forecastResponse.status === 404) {
                throw new Error(`City "${city}" not found. Please check the spelling and try again.`);
            } else if (currentWeatherResponse.status === 401 || forecastResponse.status === 401) {
                throw new Error('API key invalid. Please contact support.');
            } else {
                throw new Error('Failed to fetch weather data. Please try again later.');
            }
        }

        currentWeatherData = await currentWeatherResponse.json();
        forecastData = await forecastResponse.json();

        displayCurrentWeather(currentWeatherData);
        displayForecast(forecastData);
        createCharts(forecastData);
        updateLastUpdatedTime();
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError(error.message);
    } finally {
        hideSpinner();
    }
}

function displayCurrentWeather(data) {
    const weatherWidget = document.getElementById('weatherWidget');
    const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';

    document.getElementById('cityName').textContent = data.name;
    document.getElementById('temperature').textContent = `${data.main.temp}${unitSymbol}`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `Humidity: ${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `Wind Speed: ${data.wind.speed} ${temperatureUnit === 'metric' ? 'm/s' : 'mph'}`;

    const iconUrl = `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
    document.getElementById('weatherIcon').innerHTML = `<img src="${iconUrl}" alt="Weather icon">`;

    weatherWidget.style.backgroundImage = getWeatherBackground(data.weather[0].main);

    // Add fade-in animation
    weatherWidget.style.animation = 'fadeIn 0.5s ease-in-out';
}

function getWeatherBackground(weatherCondition) {
    const backgrounds = {
        Clear: 'url("images/sunnybg.jpeg")',
        Clouds: 'url("path_to_cloudy_image.jpg")',
        Rain: 'url("images/rainybg.jpeg")',
        // Add more weather conditions and corresponding background images
    };
    return backgrounds[weatherCondition] || 'none';
}

function displayForecast(data) {
    const forecastTable = document.getElementById('forecastTable');
    let tableHTML = `
        <table>
            <tr>
                <th>Date</th>
                <th>Temperature</th>
                <th>Weather</th>
            </tr>
    `;

    const dailyForecasts = data.list.filter((forecast, index) => index % 8 === 0);

    dailyForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000).toLocaleDateString();
        const temp = forecast.main.temp;
        const weather = forecast.weather[0].description;
        const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';

        tableHTML += `
            <tr>
                <td>${date}</td>
                <td>${temp}${unitSymbol}</td>
                <td>${weather}</td>
            </tr>
        `;
    });

    tableHTML += '</table>';
    forecastTable.innerHTML = tableHTML;

    // Add fade-in animation
    forecastTable.style.animation = 'fadeIn 0.5s ease-in-out';
}

function toggleTemperatureUnit() {
    temperatureUnit = temperatureUnit === 'metric' ? 'imperial' : 'metric';
    document.getElementById('unitToggle').textContent = `Toggle to ${temperatureUnit === 'metric' ? '°F' : '°C'}`;
    if (currentWeatherData && forecastData) {
        getWeather();
    }
}

function displayError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}

// Filter functions
function sortTemperatures(order) {
    if (!forecastData) return;

    const dailyForecasts = forecastData.list.filter((forecast, index) => index % 8 === 0);
    dailyForecasts.sort((a, b) => {
        return order === 'asc' ? a.main.temp - b.main.temp : b.main.temp - a.main.temp;
    });

    displaySortedForecast(dailyForecasts);
}

function filterRainyDays() {
    if (!forecastData) return;

    const rainyDays = forecastData.list.filter(forecast =>
        forecast.weather[0].main.toLowerCase().includes('rain')
    );

    displayFilteredForecast(rainyDays);
}

function showHighestTemperature() {
    if (!forecastData) return;

    const highestTempForecast = forecastData.list.reduce((max, forecast) =>
        forecast.main.temp > max.main.temp ? forecast : max
    );

    displayHighestTemperature(highestTempForecast);
}

function displaySortedForecast(sortedForecasts) {
    const forecastTable = document.getElementById('forecastTable');
    let tableHTML = `
        <table>
            <tr>
                <th>Date</th>
                <th>Temperature</th>
                <th>Weather</th>
            </tr>
    `;

    sortedForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000).toLocaleDateString();
        const temp = forecast.main.temp;
        const weather = forecast.weather[0].description;
        const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';

        tableHTML += `
            <tr>
                <td>${date}</td>
                <td>${temp}${unitSymbol}</td>
                <td>${weather}</td>
            </tr>
        `;
    });

    tableHTML += '</table>';
    forecastTable.innerHTML = tableHTML;
}

function displayFilteredForecast(filteredForecasts) {
    const forecastTable = document.getElementById('forecastTable');
    let tableHTML = `
        <table>
            <tr>
                <th>Date</th>
                <th>Temperature</th>
                <th>Weather</th>
            </tr>
    `;

    filteredForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000).toLocaleDateString();
        const temp = forecast.main.temp;
        const weather = forecast.weather[0].description;
        const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';

        tableHTML += `
            <tr>
                <td>${date}</td>
                <td>${temp}${unitSymbol}</td>
                <td>${weather}</td>
            </tr>
        `;
    });

    tableHTML += '</table>';
    forecastTable.innerHTML = tableHTML;
}

function displayHighestTemperature(highestTempForecast) {
    const forecastTable = document.getElementById('forecastTable');
    const date = new Date(highestTempForecast.dt * 1000).toLocaleDateString();
    const temp = highestTempForecast.main.temp;
    const weather = highestTempForecast.weather[0].description;
    const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';

    let tableHTML = `
        <table>
            <tr>
                <th>Date</th>
                <th>Highest Temperature</th>
                <th>Weather</th>
            </tr>
            <tr>
                <td>${date}</td>
                <td>${temp}${unitSymbol}</td>
                <td>${weather}</td>
            </tr>
        </table>
    `;

    forecastTable.innerHTML = tableHTML;
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) {
        displayError('Please enter a message');
        return;
    }

    chatInput.value = '';
    displayMessage('You', message);

    try {
        const weatherKeywords = ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'wind', 'humidity'];
        const isWeatherQuery = weatherKeywords.some(keyword => message.toLowerCase().includes(keyword));

        if (isWeatherQuery) {
            const cityMatch = message.match(/(?:in|for|at)\s+([A-Za-z\s]+)(?:\s|$)/i) ||
                message.match(/([A-Za-z\s]+?)(?:'s\s+weather|weather(?:\s|$))/i);

            if (cityMatch && cityMatch[1]) {
                displayMessage('Chatbot', '...typing');
                const weatherData = await fetchWeatherData(cityMatch[1].trim());

                // Remove typing indicator
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.removeChild(chatMessages.lastChild);

                const response = generateWeatherResponse(weatherData);
                displayMessage('Chatbot', response);
            } else {
                displayMessage('Chatbot', "I noticed you're asking about weather. Could you specify which city you're interested in?");
            }
        } else {
            try {
                displayMessage('Chatbot', '...thinking');
                const geminiResponse = await getGeminiResponse(message);

                // Remove thinking indicator
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.removeChild(chatMessages.lastChild);

                displayMessage('Chatbot', geminiResponse);
            } catch (error) {
                displayMessage('Chatbot', 'I apologize, but I encountered an error processing your request. Please try again.');
                displayError('Failed to get AI response. Please try again later.');
            }
        }
    } catch (error) {
        console.error('Chat error:', error);
        displayMessage('Chatbot', 'I apologize, but I encountered an error. Please try again.');
        displayError(error.message);
    }
}
async function fetchWeatherData(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${temperatureUnit}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Weather data fetch failed');
    }
    return await response.json();
}
async function getWeatherData(message) {
    // Extract city name from message and fetch weather data
    // This is a simplified example
    const city = message.split(' ').pop();
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    return await response.json();
}

function generateWeatherResponse(weatherData) {
    const temp = Math.round(weatherData.main.temp);
    const description = weatherData.weather[0].description;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const unitSymbol = temperatureUnit === 'metric' ? '°C' : '°F';
    const windSpeedUnit = temperatureUnit === 'metric' ? 'm/s' : 'mph';

    return `In ${weatherData.name}, it's currently ${temp}${unitSymbol} with ${description}. 
            The humidity is ${humidity}% and wind speed is ${windSpeed} ${windSpeedUnit}. 
            ${generateWeatherAdvice(temp, description)}`;
}
function generateWeatherAdvice(temp, description) {
    let advice = '';

    // Temperature-based advice
    if (temp < 10) {
        advice = "Don't forget to wear warm clothes!";
    } else if (temp > 30) {
        advice = "Stay hydrated and try to stay in shade when possible.";
    }

    // Weather condition based advice
    if (description.includes('rain')) {
        advice += " Don't forget your umbrella!";
    } else if (description.includes('snow')) {
        advice += " Be careful on potentially slippery surfaces.";
    } else if (description.includes('clear')) {
        advice += " It's a great day to spend time outside!";
    }

    return advice;
}

async function getGeminiResponse(message) {
    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
        };

        // Enhance the prompt to maintain context and provide better responses
        const enhancedPrompt = `As a weather assistant, please respond to this question: ${message}. 
                              If it's not weather-related, provide a helpful general response.`;

        const body = JSON.stringify({
            contents: [{
                parts: [{
                    text: enhancedPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to get response from Gemini');
    }
}
function displayMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function createCharts(forecastData) {
    try {
        if (!forecastData || !forecastData.list || !Array.isArray(forecastData.list)) {
            throw new Error('Invalid forecast data structure');
        }

        const dailyForecasts = forecastData.list.filter((forecast, index) => index % 8 === 0);

        if (dailyForecasts.length === 0) {
            throw new Error('No forecast data available');
        }

        createTemperatureBarChart(dailyForecasts);
        createConditionsDoughnutChart(dailyForecasts);
        createTemperatureLineChart(dailyForecasts);
    } catch (error) {
        console.error('Error creating charts:', error);
        displayError('Failed to create weather charts: ' + error.message);
    }
}
function createTemperatureBarChart(dailyForecasts) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    const labels = dailyForecasts.map(forecast => new Date(forecast.dt * 1000).toLocaleDateString());
    const temperatures = dailyForecasts.map(forecast => forecast.main.temp);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature',
                data: temperatures,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: temperatureUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '5-Day Temperature Forecast'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function createConditionsDoughnutChart(dailyForecasts) {
    const ctx = document.getElementById('conditionsChart').getContext('2d');
    const conditions = dailyForecasts.map(forecast => forecast.weather[0].main);
    const conditionCounts = conditions.reduce((acc, condition) => {
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(conditionCounts);
    const data = Object.values(conditionCounts);
    const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
    ];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weather Conditions Distribution'
                },
                legend: {
                    position: 'bottom'
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

function createTemperatureLineChart(dailyForecasts) {
    const ctx = document.getElementById('temperatureLineChart').getContext('2d');
    const labels = dailyForecasts.map(forecast => new Date(forecast.dt * 1000).toLocaleDateString());
    const temperatures = dailyForecasts.map(forecast => forecast.main.temp);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature',
                data: temperatures,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: temperatureUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Temperature Trend'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuad'
            }
        }
    });
}
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

document.getElementById('sendBtn').addEventListener('click', sendChatMessage);
function updateLastUpdatedTime() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleString()}`;
}
// Call this function when the page loads
window.addEventListener('load', getLocationAndWeather);