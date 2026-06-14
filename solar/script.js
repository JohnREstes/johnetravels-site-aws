const REFRESH_RATE = 15; //seconds

const HOST = 'https://node.johnetravels.com/app1';
const CACHED_DATA_API = `${HOST}/api/cachedData`;
const VICTRON_API = `${HOST}/api/victron/data`;
const GROWATT_API = `${HOST}/api/growattData`;
const YESTERDAY_API = `${HOST}/api/lastEntry`;
const HA_API = `${HOST}/api/ha/latest`;

const loadingGraphic = document.getElementById('loadingGraphic')
let victronAPItimestamp = 0;
var storedToken = null
var initalLoad = true;

async function cachedDataCall() {
    try {
      // Initial Cache Call
      var requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`,
        },
        redirect: 'follow'
      };
    
      try {
        const response = await fetch(CACHED_DATA_API, requestOptions);
        const result = await response.text();
        const jsonResult = await JSON.parse(result)
        
        if (!result) {
          return; // Exit early if the response is empty
        }
    
        try {
          if(jsonResult.victron){
            let VData = jsonResult.victron; // Parse the JSON response
            await format_data(VData);
          }
          if(jsonResult.growatt){
            let GData = jsonResult.growatt; // result is a JSON string
            await formatGrowattData(GData);
          }
          if (jsonResult.ha) {
            formatHAData(jsonResult.ha);
          }

          //return data
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          throw parseError; // Rethrow the error if needed
        }
    
      } catch (error) {
        console.log('Network or API error:', error);
        throw error; // Rethrow the error to handle it outside this function if needed
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle any errors that occurred during the API calls
    }
    updatePVTotal()
    get_Yesterday_Solar(YESTERDAY_API);
}

async function fetchData() {
  if (storedToken) {
    try {
      await get_Growatt_Data(GROWATT_API);
      await get_Data(VICTRON_API);
      await get_HA_Data(HA_API);
      updatePVTotal()
      time_Stamp();
      loadingGraphic.classList.add('none');

    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle any errors that occurred during the API calls
    }
  }
}

async function get_HA_Data(url) {
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
    if (!response.ok) return;

    const data = await response.json();
    console.log('[HA DATA]', data);
    formatHAData(data);

  } catch (error) {
    console.error('HA fetch error:', error);
  }
}

function formatHAData(data) {
  if (!data || !data["sensor.lp_tank_level_percentage"]) return;

  const lpSensor = data["sensor.lp_tank_level_percentage"];
  const value = parseFloat(lpSensor.state);

  // Example DOM target
  const lpElm = document.getElementById('lpTankLevel');

  if (lpElm) {
    lpElm.innerText = `${value.toFixed(1)}%`;
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
    
    if (!result) {
      return; // Exit early if the response is empty
    }

    try {
      let data = JSON.parse(result); // Parse the JSON response
      await format_data(data);
      //return data
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.error('Response that caused the error:', result);
      throw parseError; // Rethrow the error if needed
    }

  } catch (error) {
    console.log('Network or API error:', error);
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
    redirect: 'follow',
  };

  try {
    const response = await fetch(url, requestOptions);

    // Ensure the response is OK before parsing
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json(); // Parse JSON directly

    // Convert the string into an array called 'solarData'
    const solarData = result.lastEntry.split('\n');

    // Get the current hour in EST (UTC-5)
    const now = new Date();
    const utcHour = now.getUTCHours(); // Current hour in UTC
    const estHour = (utcHour - 5 + 24) % 24; // Adjust for EST and handle negative values
    let VRMyesterdayValue, after6LastEntry = 0;

    // Time check: between 18:00 (6 PM) and 24:00 (midnight) EST
    if (estHour >= 18 && estHour < 24) {
      // Store the second to last line in a separate variable
      VRMyesterdayValue = solarData[solarData.length - 2];
      after6LastEntry = solarData[solarData.length - 1];
      const after6Sum = processSum(after6LastEntry);

      // Display the result in the specified DOM element
      const elm = document.getElementById('VRMtoday');
      elm.innerText = `${after6Sum} kWh`;

    } else {
      // Store the last line in a separate variable
      VRMyesterdayValue = solarData[solarData.length - 1];
    }

    function processSum(dataValue){
      // Extract values from the last entry using a regex to capture the array inside brackets
      const valuesString = dataValue.match(/\[([^\]]+)\]/)[1];
      const valuesArray = valuesString.split(',').map((value) => value.trim());

      // Convert the values to numbers, removing units and non-numeric characters
      const values = valuesArray.map((value) =>
        parseFloat(value.replace(/[^0-9.-]/g, ''))
      );

      // Calculate the sum of the values
      const sum = values.reduce((acc, value) => acc + value, 0);
      const formattedSum = sum.toFixed(2);
      return formattedSum;
    }
    const formattedValue = processSum(VRMyesterdayValue)

    // Display the result in the specified DOM element
    const elm = document.getElementById('VRMyesterday');
    elm.innerText = `${formattedValue} kWh`;

  } catch (error) {
    console.error('Error:', error);
    throw error; // Optional: Rethrow the error for external handling if needed
  }
}


var todayTotalPower = []; 
async function format_data(data) {
  // formats data so that second Solar controller shows up
  const newArray = processArray(data);

  let elm;
    for (const record of newArray) {
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
        case "94_HQ2131HZ2ZV":
          elm = document.getElementById("VRMyesterdayTower")
          elm.innerText = record.formattedValue
          //allow for sum below
          todayTotalPower[0] = record.formattedValue;     
          break;
        case "94_HQ2342AE2NT":
          elm = document.getElementById("VRMyesterdayPergola")
          elm.innerText = record.formattedValue
          //allow for sum below
          todayTotalPower[1] = record.formattedValue;     
          break;
        case 96:
          // elm = document.getElementById("VRMyesterday")
          // elm.innerText = record.formattedValue        
          break;
        case "442_HQ2342AE2NT":
          elm = document.getElementById("VRMpowerPergola")
          elm.innerText = record.formattedValue        
          break;
        case "442_HQ2131HZ2ZV":
          elm = document.getElementById("VRMpowerTower")
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
    if (window.matchMedia('(max-width: 425px)').matches) {
      chargingDischarge.innerHTML = '<i class="fa-solid fa-battery-full"></i>Dischg';
    } else {
      chargingDischarge.innerHTML = `<i class="fa-solid fa-battery-full"></i>Discharging`;
    }
    const element = document.querySelector('.left-div span');
    element.style.animation = 'moveb 2s linear infinite';

  } else {
    chargingDischarge.innerHTML = '<i class="fa-solid fa-battery-full"></i>Charging';
    const element = document.querySelector('.left-div span');
    element.style.animation = 'move 2s linear infinite';
  }
} 

// Format values for each Smart Solar MPPT
function processArray(array) {
  // Create a map for 'instance' to 'formattedValue' from items with idDataAttribute 118
  const instanceMap = {};
  array.forEach(item => {
    if (item.idDataAttribute === 118) {
      instanceMap[item.instance] = item.formattedValue;
    }
  });

  // Process the array and modify idDataAttribute for 94 and 442
  const processedArray = array.map(item => {
    if (item.idDataAttribute === 94 || item.idDataAttribute === 442) {
      const instance = item.instance;
      const formattedValue = instanceMap[instance]; // Get corresponding formattedValue

      if (formattedValue) {
        // Modify idDataAttribute
        return {
          ...item,
          idDataAttribute: `${item.idDataAttribute}_${formattedValue}`
        };
      }
    }
    // Return the item unmodified if no changes are needed
    return item;
  });

  // Return the processed array without duplicate removal
  return processedArray;
}

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

    //const gridPower = parseInt(data.yolandaData.gridPower) + parseInt(data.casaMJData1.gridPower) + parseInt(data.casaMJData2.gridPower);
    const gridPower = parseInt(data.casaMJData1.gridPower) + parseInt(data.casaMJData2.gridPower);
    
    inputPowerTotal.innerText = `${gridPower} W`;
    yolandaInput.innerText = `${data.yolandaData.gridPower} W`;
    casa1Input.innerText = `${data.casaMJData1.gridPower} W`;
    casa2Input.innerText = `${data.casaMJData2.gridPower} W`;

    const condText = document.getElementById('cond_txt'); 
    const hum = document.getElementById('hum');
    const tmp = document.getElementById('tmp');  

    condText.innerText = `${data.weatherDataCasaMJ.now.cond_txt}`
    hum.innerText = `${data.weatherDataCasaMJ.now.hum}% hum.`
    const F = ((data.weatherDataCasaMJ.now.tmp) * 9/5) + 32
    tmp.innerText = `${F}°F`

    // Get the current hour in EST (UTC-5) to correct Growatt error (6 pm rollover)
    let sum = 0;
    const now = new Date();
    const utcHour = now.getUTCHours(); // Current hour in UTC
    const estHour = (utcHour - 5 + 24) % 24; // Adjust for EST and handle negative values

    // Time check: before 18:00 (6 PM)
    if (estHour < 18) {
      const yolandaDayTotal = data.yolandaDataTotal.epvToday
      const casa1DayTotal = data.casaMJData1Total.epvToday
      const casa2DayTotal = data.casaMJData2Total.epvToday
  
      todayTotalPower[2] = yolandaDayTotal;
      todayTotalPower[3] = casa1DayTotal;
      todayTotalPower[4] = casa2DayTotal;
  
      // Calculate the sum of the values
      const numericValues = todayTotalPower.map(value => {
        // Remove non-numeric characters (like 'kWh') and convert to a float
        return parseFloat(value.replace(/[^\d.-]/g, ''));
      });
      sum = (numericValues.reduce((accumulator, currentValue) => accumulator + currentValue, 0)).toFixed(2);

      const VRMtodayTotal = document.getElementById('VRMtoday');
      VRMtodayTotal.innerHTML = sum + " kWh"
    }

    const acCasa1Text = document.getElementById("Casa1input").innerText;
    const acCasa2Text = document.getElementById("Casa2input").innerText;  
    
    // Parse the text content to integers
    const acCasa1Int = parseInt(acCasa1Text); 
    const acCasa2Int = parseInt(acCasa2Text);
    
    // Select the span inside the .up-div element
    const upDiv = document.querySelector('.up-div span');
    const highLeft = document.querySelector('.highLeft span');
    const highRight = document.querySelector('.highRight span');

    highRight.style.animation = 'move 2s linear infinite';
    
    // Apply the animation based on the integer values
    if (acCasa1Int > 0 || acCasa2Int > 0) {
      upDiv.style.animation = 'moveb 2s linear infinite';
      highLeft.style.animation = 'moveb 2s linear infinite';
    } else {
      upDiv.style.animation = 'move 2s linear infinite';
      highLeft.style.animation = 'none';
    }

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

async function sendLoginCode() {
  const email = document.getElementById('email').value;

  const response = await fetch(`${HOST}/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (response.ok) {
    localStorage.setItem('loginEmail', email);
    document.getElementById('codeSection').style.display = 'block';
  } else {
    alert('Unable to send login code.');
  }
}

async function verifyLoginCode() {
  const email = localStorage.getItem('loginEmail');
  const code = document.getElementById('loginCode').value;

  const response = await fetch(`${HOST}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('token', data.token);
    await handleToken();
  } else {
    alert('Invalid or expired code.');
  }
}

async function handleToken() {
  storedToken = localStorage.getItem('token');

  if (storedToken) {
    try {
      const response = await fetch(`${HOST}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        if (initalLoad) {
          await cachedDataCall();
          initalLoad = false;
          loadingGraphic.classList.add('none');
        }

        loginContainer.style.display = 'none';
      } else {
        console.error('Token invalid:', response.statusText);
        loginContainer.style.display = 'flex';
      }
    } catch (error) {
      console.error('Token check error:', error.message);
      loginContainer.style.display = 'flex';
    }
  } else {
    loginContainer.style.display = 'flex';
  }
}

handleToken();

// Function to calculate and update PVTotal
function updatePVTotal() {
  const vrmPowerPergola = parseFloat(document.getElementById('VRMpowerPergola').textContent) || 0;
  const vrmPowerTower = parseFloat(document.getElementById('VRMpowerTower').textContent) || 0;
  const yolandaPower = parseFloat(document.getElementById('Yolandapower').textContent) || 0;
  const casa1Power = parseFloat(document.getElementById('Casa1power').textContent) || 0;
  const casa2Power = parseFloat(document.getElementById('Casa2power').textContent) || 0;

  const pvTotal = vrmPowerPergola + vrmPowerTower + yolandaPower + casa1Power + casa2Power;
  document.getElementById('PVTotal').textContent = pvTotal.toFixed(0) + " W";
  if(pvTotal > 1) {
    const element = document.querySelector('.right-div span');
    element.style.animation = 'moveb 2s linear infinite';
  }
}

// Responsive content for different screen sizes
function updateShorterWords() {
  const element = document.getElementById('pvCharger'); // Replace with your element ID
  if (window.matchMedia('(max-width: 425px)').matches) {
      element.innerHTML = `<i class="fa-solid fa-solar-panel"></i>PV Chgr.`;
  } else {
      element.innerHTML = `<i class="fa-solid fa-solar-panel"></i>PV Charger`;
  }
}

updateShorterWords();

// Toggle Details Functionality
const toggleButton = document.getElementById('toggle-all-details');
const boxes = document.querySelectorAll('.box');
const highLeft = document.querySelector('.highLeft');
const highRight = document.querySelector('.highRight');
const toggleDarkButton = document.getElementById('toggle-dark-mode');
    
// Function to update the UI based on the current state
function updateUI(expanded) {
    boxes.forEach(box => {
        box.classList.toggle('expanded', expanded);
    });

    if (expanded) {
        highLeft.style.top = '-200px';
        highRight.style.top = '-205px';
    } else {
        highLeft.style.top = '-110px'; 
        highRight.style.top = '-115px'; 
    }

    toggleButton.textContent = expanded ? 'Hide Details' : 'Show Details';
}

// Function to toggle the details and save the preference
function toggleDetails() {
    const allExpanded = [...boxes].every(box => box.classList.contains('expanded'));
    const newExpandedState = !allExpanded;
    updateUI(newExpandedState);
    localStorage.setItem('detailsExpanded', newExpandedState); // Save state in localStorage
}

// Event listener for the toggle button
toggleButton.addEventListener('click', toggleDetails);

// On page load, set the UI based on saved state
document.addEventListener('DOMContentLoaded', () => {
    const savedDetailsState = localStorage.getItem('detailsExpanded') === 'true';
    updateUI(savedDetailsState);
    
    // Load dark mode preference on page load
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    isDarkMode = savedDarkMode;
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateIcon();
});

// DARK MODE Functionality
let isDarkMode = localStorage.getItem('darkMode') === 'true'; // Load dark mode state from localStorage

// Function to update the icon based on the mode
function updateIcon() {
    if (isDarkMode) {
        toggleDarkButton.classList.remove('fa-moon');
        toggleDarkButton.classList.add('fa-sun');
    } else {
        toggleDarkButton.classList.remove('fa-sun');
        toggleDarkButton.classList.add('fa-moon');
    }
}

// Toggle dark mode and save the state to localStorage
toggleDarkButton.addEventListener('click', function() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    updateIcon();
    localStorage.setItem('darkMode', isDarkMode); // Save dark mode state in localStorage
});

// modal Past Solar

async function buildModal(url) {
    const requestOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
        },
        redirect: 'follow',
    };

    try {
        const response = await fetch(url, requestOptions);
        const result = await response.json();

        const solarData = result.lastEntry.split('\n');

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = ''; // Clear previous content

        // Reverse the order of entries
        const reversedSolarData = solarData.reverse();

        // Calculate the maximum value across all entries
        let maxValue = 0;
        reversedSolarData.forEach((entry) => {
            const match = entry.match(/Date: ([^:]+): \[(.+)\]/);
            if (match) {
                const valuesString = match[2];
                const valuesArray = valuesString
                    .split(',')
                    .map(value => parseFloat(value.trim().replace(/[^0-9.-]/g, '')));
                const entryMax = Math.max(...valuesArray);
                if (entryMax > maxValue) {
                    maxValue = entryMax; // Update maxValue if a larger entry is found
                }
            }
        });

        // Build the cards
        reversedSolarData.forEach((entry, index) => {
            const match = entry.match(/Date: ([^:]+): \[(.+)\]/);
            if (!match) {
                console.warn(`No values found for entry: ${entry}`);
                return; // Skip this entry if no match is found
            }

            const date = match[1]; // This captures the date part
            const valuesString = match[2]; // This captures the values part

            const valuesArray = valuesString
                .split(',')
                .map(value => parseFloat(value.trim().replace(/[^0-9.-]/g, '')));

            const total = valuesArray.reduce((acc, val) => acc + val, 0).toFixed(2);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${date}</h3>
                <p>Total: ${total} kWh</p>
                <canvas id="chart${index}" width="400" height="200"></canvas>
            `;

            modalBody.appendChild(card);

            const ctx = document.getElementById(`chart${index}`).getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Tower', 'Pergola', 'Yolanda', 'Casa East', 'Casa West'],
                    datasets: [
                        {
                            label: 'kWh',
                            data: valuesArray,
                            backgroundColor: ['#f0c43e', '#e97180', '#8ca65a', '#acd2cc', '#335951'],
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { callbacks: { label: (tooltipItem) => `${tooltipItem.raw} kWh` } },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: maxValue, // Set the maximum scale to the calculated max value
                        },
                    },
                },
            });
        });

        const modal = document.getElementById('solarDataModal');
        modal.style.display = 'flex'; // Set display to flex
        modal.classList.add('fade-in');

    } catch (error) {
        console.error('Error:', error);
    }
}

// Close Modal Function
function closeModal() {
  const modal = document.getElementById('solarDataModal');
    modal.classList.add('fade-out')
    setTimeout(()=>{
      modal.style.display = 'none';
      modal.classList.remove('fade-out')
    },1000)
     
 if (modal.classList.contains('fade-in')) {
     modal.classList.remove('fade-in');
     }
}

// Event Listener for opening the modal
const pastSolarButton = document.getElementById('pastDetails');

pastSolarButton.addEventListener('click', (e) => {
  e.preventDefault();
  buildModal(YESTERDAY_API); // Ensure this function is set to build modal content
});

// Event Listener for closing the modal on clicking outside
document.getElementById('solarDataModal').addEventListener('click', function (event) {
  if (event.target === this) {
      closeModal();
  }
});