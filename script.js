const REFRESH_RATE = 10; //seconds
//const HOST = 'http://127.0.0.1:3000';
const HOST = 'https://node.johnetravels.com/app1';
const VICTRON_API = `${HOST}/api/victron/data`;
const GROWATT_API = `${HOST}/api/growattData`;
const YESTERDAY_API = `${HOST}/api/lastEntry`;
const loadingGraphic = document.getElementById('loadingGraphic')
let victronAPItimestamp = 0;
var storedToken = null


async function fetchData() {
  if (storedToken) {
    time_Stamp();
    try {
      // Start all API calls concurrently
      const victronPromise = get_Data(VICTRON_API);
      const growattPromise = get_Growatt_Data(GROWATT_API);
      const yesterdayPromise = get_Yesterday_Solar(YESTERDAY_API);

      // Wait for all API calls to complete
      await Promise.all([
        victronPromise,
        growattPromise,
        yesterdayPromise
      ]);

      loadingGraphic.classList.add('none');

    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle any errors that occurred during the API calls
    }
  }
}

async function get_Data(url) {
  var requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
    },
    redirect: 'follow'
  };

  try {
    const response = await fetch(url, requestOptions);
    const result = await response.text();
    let data = JSON.parse(result); // result is a JSON string
    format_data(data);
    //return data
  } catch (error) {
    console.log('error', error);
    throw error; // Rethrow the error to handle it outside this function if needed
  }
}

async function get_Growatt_Data(url) {
  var requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
    },
    redirect: 'follow'
  };

  try {
    const response = await fetch(url, requestOptions);
    const result = await response.text();
    let data = JSON.parse(result); // result is a JSON string
    formatGrowattData(data);
    //return data
  } catch (error) {
    console.log('error', error);
    throw error; // Rethrow the error to handle it outside this function if needed
  }
}

async function get_Yesterday_Solar(url) {
  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
    },
    redirect: 'follow'
  };

  try {
    const response = await fetch(url, requestOptions);
    const result = await response.json(); // Parse JSON directly
    const lastEntry = result.lastEntry;

    // Extract values from the last entry
    const valuesString = lastEntry.match(/\[([^\]]+)\]/)[1];
    const valuesArray = valuesString.split(',').map(value => value.trim());

    // Convert the values to numbers, stripping out any units
    const values = valuesArray.map(value => parseFloat(value.replace(/[^0-9.-]/g, '')));

    // Calculate the sum of the values
    const sum = values.reduce((acc, value) => acc + value, 0);

    const formattedSum = sum.toFixed(2);

    let elm = document.getElementById("VRMyesterday")
    elm.innerText = `${formattedSum} kWh`      

  } catch (error) {
    console.error('Error:', error);
    throw error; // Rethrow the error to handle it outside this function if needed
  }
}

async function format_data(data) {
  let elm;
    for (const record of data) {
      switch (record.idDataAttribute) {
        case 81:
          elm = document.getElementById("VRMvoltage");
          elm.innerText = record.formattedValue;
          victronAPItimestamp = record.timestamp;
          break;
        case 49:
          elm = document.getElementById("VRMcurrent")
          elm.innerText = record.formattedValue
          break;
        case 51:
          elm = document.getElementById("VRMstate")
          elm.innerText = record.formattedValue        
          break;
        case 94:
          //elm = document.getElementById("VRMtoday")
          //elm.innerText = record.formattedValue
          //removed to allow for sum below
          todayTotalPower[0] = record.formattedValue;     
          break;
        case 96:
          // elm = document.getElementById("VRMyesterday")
          // elm.innerText = record.formattedValue        
          break;
        case 442:
          elm = document.getElementById("VRMpower")
          elm.innerText = record.formattedValue        
          break;
        case 243:
          elm = document.getElementById("VRMBatteryPower")
          elm.innerText = record.formattedValue        
          break;    
        case 146:
          elm = document.getElementById("TimeToGo")
          const match = record.formattedValue.match(/(\d+(\.\d+)?)\s*(\w+)/);
          if (match) {
              // Extract the number and unit
              const number = parseFloat(match[1]); // Convert the number part to a float
              const unit = match[3]; // Extract the unit part (e.g., 'h')
              
              // Round the number to the nearest integer using toFixed(0)
              const roundedNumber = number.toFixed(0);
              
              // Return the formatted string
              elm.innerText = `${roundedNumber} ${unit}`;
          }    
          break;  
        default:
          break;
      }
    }
    const chargingDischarge = document.getElementById('charging_discharging');
    const vrmCurrentText = document.getElementById("VRMcurrent").innerText;
    
    if (vrmCurrentText.includes('-')) {
      if (window.matchMedia('(max-width: 390px)').matches) {
        chargingDischarge.innerHTML = '<i class="fa-solid fa-battery-full"></i>Discharging';
      } else {
        chargingDischarge.innerHTML = `<i class="fa-solid fa-battery-full"></i>Dischg`;
      }
      const element = document.querySelector('.left-div span');
      element.style.animation = 'moveb 2s linear infinite';

    } else {
      chargingDischarge.innerHTML = '<i class="fa-solid fa-battery-full"></i>Charging';
      const element = document.querySelector('.left-div span');
      element.style.animation = 'move 2s linear infinite';
    }
  }

var todayTotalPower = [];  

async function formatGrowattData(data){
   
    const yolandaPower = document.getElementById('Yolandapower');
    const casa1Power = document.getElementById('Casa1power');
    const casa2Power = document.getElementById('Casa2power');

    yolandaPower.innerText = `${data.yolandaData.panelPower} W`;
    casa1Power.innerText = `${data.casaMJData1.panelPower} W`;
    casa2Power.innerText = `${data.casaMJData2.panelPower} W`;

    const loadsTotal = document.getElementById('loadsTotal')
    const yolandaLoad = document.getElementById('Yolandaload'); 
    const casa1Load = document.getElementById('Casa1load');
    const casa2Load = document.getElementById('Casa2load');  

    const loadPower = parseInt(data.yolandaData.loadPower) + parseInt(data.casaMJData1.loadPower) + parseInt(data.casaMJData2.loadPower);

    loadsTotal.innerText = `${loadPower} W`;
    yolandaLoad.innerText = `${data.yolandaData.loadPower} W`;
    casa1Load.innerText = `${data.casaMJData1.loadPower} W`;
    casa2Load.innerText = `${data.casaMJData2.loadPower} W`;

    const inputPowerTotal = document.getElementById('inputPowerTotal')
    const yolandaInput = document.getElementById('Yolandainput'); 
    const casa1Input = document.getElementById('Casa1input');
    const casa2Input = document.getElementById('Casa2input');  

    const gridPower = parseInt(data.yolandaData.gridPower) + parseInt(data.casaMJData1.gridPower) + parseInt(data.casaMJData2.gridPower);

    inputPowerTotal.innerText = `${gridPower} W`;
    yolandaInput.innerText = `${data.yolandaData.gridPower} W`;
    casa1Input.innerText = `${data.casaMJData1.gridPower} W`;
    casa2Input.innerText = `${data.casaMJData2.gridPower} W`;

    const condText = document.getElementById('cond_txt'); 
    const hum = document.getElementById('hum');
    const tmp = document.getElementById('tmp');  

    condText.innerText = `${data.weatherDataCasaMJ.now.cond_txt}`
    hum.innerText = `${data.weatherDataCasaMJ.now.hum}% hum.`
    tmp.innerText = `${data.weatherDataCasaMJ.now.tmp}°C`

    const yolandaDayTotal = data.yolandaDataTotal.epvToday
    const casa1DayTotal = data.casaMJData1Total.epvToday
    const casa2DayTotal = data.casaMJData2Total.epvToday

    todayTotalPower[1] = yolandaDayTotal;
    todayTotalPower[2] = casa1DayTotal;
    todayTotalPower[3] = casa2DayTotal;

    // Calculate the sum of the values
    const numericValues = todayTotalPower.map(value => {
      // Remove non-numeric characters (like 'kWh') and convert to a float
      return parseFloat(value.replace(/[^\d.-]/g, ''));
    });
    const sum = (numericValues.reduce((accumulator, currentValue) => accumulator + currentValue, 0)).toFixed(2);

    const VRMtodayTotal = document.getElementById('VRMtoday');
    VRMtodayTotal.innerHTML = sum + " kWh"
}

fetchData();

setInterval(fetchData, REFRESH_RATE * 1000)

function time_Stamp() {
  // Get the current date and time
  const currentDate = new Date();
  const victronAPItimestampConverted = new Date((victronAPItimestamp * 1000));

  // Convert the date and time to a string without seconds in the user's local time zone
  const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let el = document.getElementById('timeStamp');
  el.innerText = formattedTime;
}

const loginContainer = document.getElementById('loginContainer');
const settingsLocalP = document.getElementById('settingLocal');
var savedSettings = JSON.parse(localStorage.getItem('settings'));
var hostName = `${HOST}/`

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch(`${HOST}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        const data = await response.json();
        const token = data.token;
        localStorage.setItem('token', token);
        await handleToken();
      } else {
        alert('Invalid credentials. Please try again.');
      }
      
  }

  async function handleToken() {
    // Retrieve token from localStorage
    storedToken = localStorage.getItem('token');
    // Check if the token is present
    if (storedToken) {
      try {
        // Make a request with the token in the headers
        const response = await fetch(`${HOST}/protected-route`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
        });
  
        if (response.ok) {
          const data = await response.json();
          loginContainer.style.display = 'none'
        } else {
          console.error('Error:', response.statusText);
          loginContainer.style.display = 'flex'
        }
      } catch (error) {
        console.error('Error:', error.message);
        loginContainer.style.display = 'flex'
      }
    } else {
      console.log('Token not found in localStorage');
      loginContainer.style.display = 'flex'
    }
  }

handleToken()

// Function to calculate and update PVTotal
function updatePVTotal() {
  const vrmPower = parseFloat(document.getElementById('VRMpower').textContent) || 0;
  const yolandaPower = parseFloat(document.getElementById('Yolandapower').textContent) || 0;
  const casa1Power = parseFloat(document.getElementById('Casa1power').textContent) || 0;
  const casa2Power = parseFloat(document.getElementById('Casa2power').textContent) || 0;

  const pvTotal = vrmPower + yolandaPower + casa1Power + casa2Power;
  document.getElementById('PVTotal').textContent = pvTotal.toFixed(0) + " W";
  if(pvTotal > 1) {
    const element = document.querySelector('.right-div span');
    element.style.animation = 'moveb 2s linear infinite';
  }
}

// Function to observe changes in the target element
function observeElement(id) {
  const target = document.getElementById(id);
  const observer = new MutationObserver(updatePVTotal);

  // Configuration of the observer
  const config = { childList: true, subtree: true, characterData: true };

  // Start observing the target node
  observer.observe(target, config);
}

// Add observers to all power elements
observeElement('VRMpower');
observeElement('Yolandapower');
observeElement('Casa1power');
observeElement('Casa2power');

const toggleButton = document.getElementById('toggle-all-details');
const boxes = document.querySelectorAll('.box');

toggleButton.addEventListener('click', function() {
    const allExpanded = [...boxes].every(box => box.classList.contains('expanded'));

    boxes.forEach(box => {
        box.classList.toggle('expanded', !allExpanded);
    });

    this.textContent = allExpanded ? 'Show Details' : 'Hide Details';
});

// Function to update innerHTML based on screen width
function updateContent() {
  const element = document.getElementById('pvCharger'); // Replace with your element ID
  if (window.matchMedia('(max-width: 390px)').matches) {
      element.innerHTML = `<i class="fa-solid fa-solar-panel"></i>PV Chgr.`;
  } else {
      element.innerHTML = `<i class="fa-solid fa-solar-panel"></i>PV Charger`;
  }
}

// Check on initial load
updateContent();

// Add event listener to check on window resize
window.addEventListener('resize', updateContent);