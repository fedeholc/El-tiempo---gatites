const searchButton = document.getElementById("botonbuscar");
const textToSearch = document.getElementById("textobuscar");
let gifOffsetCounter = 0;
let userIPData = {};
let userWeatherData = {};

(async () => {
  userIPData = await getUserIPData();
  if (userIPData !== undefined) {
    renderUserIPData(userIPData);
    userWeatherData = await getUserWeatherData(
      userIPData.latitude,
      userIPData.longitude
    );
    if (userWeatherData !== undefined) {
      renderWeatherData(userWeatherData);
    }
  }
})();

updateCurrentDate("fecha");
let timeUpdateInterval = setInterval(() => updateCurrentDate("fecha"), 1000);

// ***********************************

// Busca en Giphy una imagen de acuerdo al clima
async function gifSearch() {
  try {
    let gifSearchKeyword = "";
    let id = userWeatherData.weather[0].id;

    // Lo siguiente arma la keyword para buscar en Giphy
    // de acuerdo al id del clima
    if (id >= 200 && id <= 232) {
      gifSearchKeyword = "Thunderstorm";
    } else if (id >= 300 && id <= 321) {
      gifSearchKeyword = "Drizzle";
    } else if (id >= 500 && id <= 531) {
      gifSearchKeyword = "Rain";
    } else if (id >= 600 && id <= 622) {
      gifSearchKeyword = "Snow";
    } else if (id == 701) {
      gifSearchKeyword = "Mist";
    } else if (id == 711) {
      gifSearchKeyword = "Smoke";
    } else if (id == 721) {
      gifSearchKeyword = "Haze";
    } else if (id == 731) {
      gifSearchKeyword = "Dust";
    } else if (id == 741) {
      gifSearchKeyword = "Fog";
    } else if (id == 751) {
      gifSearchKeyword = "Sand";
    } else if (id == 761) {
      gifSearchKeyword = "Dust";
    } else if (id == 762) {
      gifSearchKeyword = "Ash";
    } else if (id == 771) {
      gifSearchKeyword = "Squall";
    } else if (id == 781) {
      gifSearchKeyword = "Tornado";
    } else if (id == 800) {
      gifSearchKeyword = "Sun";
    } else if (id >= 801 && id <= 805) {
      gifSearchKeyword = "Clouds";
    }

    gifSearchKeyword += " cat";

    gifOffsetCounter++;
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=ifIvKli8qBbUaBparQ7JtmyCoB4XtzHH&q=${gifSearchKeyword}&limit=1&offset=${gifOffsetCounter}&rating=r`
    );

    if (response.ok === false) {
      throw new Error("Status code error :" + response.status);
    }
    const gifData = await response.json();

    document.getElementById("gif-del-dia").src =
      gifData.data[0].images.original.url;
  } catch (error) {
    console.log("Catched Error:", error);
  }
}

// Usa la API de Google Maps para buscar una nueva ubicación
// También usa la que devuelve la Time Zone según ubicación
async function searchLocation(keyword) {
  try {
    //
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${keyword}&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry&key=AIzaSyDvQsoVGpd4XzbWl9k10XJj4lww8ycGGXY`,
      {
        mode: "cors",
        headers: {
          "Access-Control-Allow-Origin": "https://fedeholc.github.io/*",
        },
      }
    );

    if (response.ok === false) {
      throw new Error("Status code error :" + response.status);
    }
    const placeDataResponse = await response.json();
    const placeData = placeDataResponse.candidates[0];

    let lat = placeData.geometry.location.lat;
    let lng = placeData.geometry.location.lng;

    document.getElementById("lugar").textContent = placeData.formatted_address;
    document.getElementById("nueva-ubicacion").textContent =
      "Nueva ubicación: " + placeData.formatted_address;

    userWeatherData = await getUserWeatherData(lat, lng);
    renderWeatherData(userWeatherData);

    // La api requiere que se le pase la timestamp para devolver la timezone
    // la división por 1000 es porque la timestamp tiene que estar en segundos
    // pero Date.now() te la da en milisegundos (hay que quitarle los ultimos
    // tres dígitos)
    let nowTimeStamp = (Date.now() / 1000).toFixed(0);
    const responseTZ = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat}%2C${lng}&timestamp=${nowTimeStamp}&key=AIzaSyDvQsoVGpd4XzbWl9k10XJj4lww8ycGGXY`
    );

    if (responseTZ.ok === false) {
      throw new Error("Status code error :" + response.status);
    }
    const timeZoneData = await responseTZ.json();

    clearInterval(timeUpdateInterval);

    timeUpdateInterval = setInterval(
      () =>
        updateCurrentDateUTC(
          timeZoneData.rawOffset,
          timeZoneData.dstOffset,
          "fecha"
        ),
      1000
    );
  } catch (error) {
    console.log("Catched Error:", error);
  }
}

async function getIPData() {
  try {
    const response = await fetch(
      `https://api.ipgeolocation.io/ipgeo?apiKey=ee852e03cf364a7d93d81bb3c405db9b`
    );

    if (response.ok === false) {
      throw new Error("Status code error :" + response.status);
    } else {
      const ipData = await response.json();

      document.getElementById("lugar").textContent =
        ipData.city + ", " + ipData.country_name;
    }
  } catch (error) {
    console.log("Catched Error:", error);
  }
}

searchButton.addEventListener("click", function (e) {
  searchLocation(textToSearch.value);
});

textToSearch.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    searchLocation(textToSearch.value);
  }
});

//hace el update del horario de acuerdo a la time zone de la ubicación
// para lo cual tiene que tener en cuenta rawOffset (diferencia en
// milisegundos con la UTC) y también dstOffset (diferencia si hay
// horario adelantado o atrasado según el momento del año.
function updateCurrentDateUTC(rawOffset, dstOffset, elementId) {
  let currentDate = new Date(Date.now() + rawOffset * 1000 + dstOffset * 1000);
  let minutes = currentDate.getUTCMinutes().toString();
  Number(minutes) < 10 ? (minutes = "0" + minutes) : minutes;
  document.getElementById(elementId).textContent =
    currentDate.toLocaleDateString("es-AR") +
    " - " +
    currentDate.getUTCHours() +
    ":" +
    minutes;
}

function updateCurrentDate(elementId) {
  let currentDate = new Date();
  let minutes = currentDate.getMinutes().toString();

  // Lo siguiente evita que la hora aparezca sin el cero (agregándolo)
  // delante de los minutos cuando son menores a 10
  Number(minutes) < 10 ? (minutes = "0" + minutes) : minutes;
  document.getElementById(elementId).textContent =
    currentDate.toLocaleDateString() +
    " - " +
    currentDate.getHours() +
    ":" +
    minutes;
}

// LLama a la API para obtener las coordenadas de acuerdo al IP de la usuaria
async function getUserIPData() {
  try {
    const response = await fetch(
      `https://api.ipgeolocation.io/ipgeo?apiKey=ee852e03cf364a7d93d81bb3c405db9b`
    );
    if (response.ok === false) {
      throw new Error("Status code error :" + response.status);
    } else {
      return await response.json();
    }
  } catch (error) {
    console.log("Catched Error:", error);
  }
}

function renderUserIPData(ipData) {
  if (ipData !== undefined) {
    document.getElementById("lugar").textContent =
      ipData.city + ", " + ipData.country_name;
  } else {
    document.getElementById("lugar").textContent =
      "Error: no se pudo detectar la ubicación";
  }
}

// Llama a la API del tiempo para obtener la información según las coordenadas
async function getUserWeatherData(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=f882dd3db52c156b91ba3c5c824630a0`
    );

    if (response.ok === false) {
      throw new Error("Status code error :" + response.status);
    }
    return response.json();
  } catch (error) {
    console.log("Catched Error:", error);
  }
}

// muestra en pantalla todos los datos del clima
function renderWeatherData(userWeatherData) {
  document.getElementById("weather-st-number").textContent =
    userWeatherData.main.feels_like.toFixed(0).toString();

  document.getElementById("weather-max-number").textContent =
    userWeatherData.main.temp_max.toFixed(1).toString();

  document.getElementById("weather-min-number").textContent =
    userWeatherData.main.temp_min.toFixed(1).toString();

  document.getElementById("weather-pressure").textContent =
    "Presión (hPa): " + userWeatherData.main.pressure;

  document.getElementById("weather-humidity").textContent =
    "Humedad: " + userWeatherData.main.humidity + "%";

  document.getElementById("weather-clouds").textContent =
    "Nubosidad: " + userWeatherData.clouds.all + "%";

  document.getElementById("weather-visibility").textContent =
    "Visibilidad: " + userWeatherData.visibility / 1000 + "km";

  document.getElementById("weather-wind-speed").textContent =
    "Velocidad del viento: " +
    userWeatherData.wind.speed.toFixed(0).toString() +
    "km/h";
  document.getElementById("weather-wind-deg").textContent =
    "Dirección del viento: " + userWeatherData.wind.deg + "º";

  document.getElementById("weather-description").textContent =
    userWeatherData.weather[0].description;

  // para mostrar los datos de la hora del amanecer y del atardecer
  // hay que sumarle la info (el offset) de timezone que da la API
  let time = new Date(
    (userWeatherData.sys.sunrise + userWeatherData.timezone) * 1000
  );

  let minutes = time.getUTCMinutes().toString();
  Number(minutes) < 10 ? (minutes = "0" + minutes) : minutes;
  let timeText = time.getUTCHours() + ":" + minutes;

  document.getElementById("weather-sunrise").textContent =
    "Salida del sol: " + timeText + "hs";

  time = new Date(
    (userWeatherData.sys.sunset + userWeatherData.timezone) * 1000
  );
  minutes = time.getUTCMinutes().toString();
  Number(minutes) < 10 ? (minutes = "0" + minutes) : minutes;
  timeText = time.getUTCHours() + ":" + minutes;

  document.getElementById("weather-sunset").textContent =
    "Puesta del sol: " + timeText + "hs";

  document.getElementById("weather-icon").src =
    "https://openweathermap.org/img/wn/" +
    userWeatherData.weather[0].icon +
    "@2x.png";

  gifSearch();
}
