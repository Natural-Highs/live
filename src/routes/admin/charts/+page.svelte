<!-- To do:
  * Be able to select what data to use in graph with columns toggle
  * get data from firebase
-->

<!-- <script>
// import { redirect } from "@sveltejs/kit";
// import { adminDb } from "../../../lib/firebase/firebase.admin";
//import type { PageServerLoad } from "./$types";
import { onMount, onDestroy } from 'svelte';
import { writable, get, derived } from 'svelte/store';
import Chart, { Chart as ChartType } from 'chart.js/auto';

// const all_surveys = adminDb.collection("surveys").get();
// const all_questions = adminDb.collection("questions").get();
// const all_responses = adminDb.collection("responses").get();
// const all_surveysResponses = adminDb.collection("surveyResponses").get();
// const all_users = adminDb.collection("users").get();

// Need to get each variable of survey, question, response, surveyResponse, and user from firebase
// for now i'll just create some dummy data
const all_surveys = writable([
        { id: 1, createdAt: "2021-09-01", title: "Tuesday Class", description: "A survey to gauge how members like Tuesdays." },
        { id: 2, createdAt: "2021-09-01", title: "Farm Visit", description: "A survey to gauge how members like the farm." },
        { id: 3, createdAt: "2021-09-01", title: "Park Day", description: "A survey to gauge how members like the park." }
    ]);
const all_questions = [
    {
        id: 1,
        text: "How much do you like Tuesdays",
        questionType: "multipleChoice",
        requiresNewResponse: true,
        surveyID: 1
    },
    {
        id: 1,
        text: "How much do you like the farm",
        questionType: "multipleChoice",
        requiresNewResponse: false,
        surveyID: 2
    },
    {
        id: 1,
        text: "How much do you like the park",
        questionType: "multipleChoice",
        requiresNewResponse: true,
        surveyID: 3
    }
];
const all_responses = [
    {
        id: 1,
        questionID: 1,
        responseText: "a lot",
        createdAt: "time",
        surveyResponseID: 1
    },
    {
        id: 2,
        questionID: 2,
        responseText: "a lot",
        createdAt: "time",
        surveyResponseID: 2
    },
    {
        id: 3,
        questionID: 3,
        responseText: "a lot",
        createdAt: "time",
        surveyResponseID: 3
    }
]
const all_surveysResponses = [ 
    {
        id: 1,
        surveyID: 1,
        userID: 1,
        isComplete: true,
        createdAt: "time"
    },
    {
        id: 2,
        surveyID: 2,
        userID: 2,
        isComplete: true,
        createdAt: "time"
    },
    {
        id: 3,
        surveyID: 3,
        userID: 3,
        isComplete: true,
        createdAt: "time"
    }
]

const all_users = [ 
    { 
        id: 1,
        name: "John Doe",
        email: "hi@gmail.com",
        emergencyContact: "mom",
        isadmin: false,
        age: 15,
        sexualIdentity: "boy",
        race: "white"
    },
    { 
        id: 2,
        name: "Jane Doe",
        email: "hi@gmail.com",
        emergencyContact: "mom",
        isadmin: false,
        age: 18,
        sexualIdentity: "girl",
        race: "latina"
    }
]
const validChartTypes = ['line', 'bar', 'pie', 'doughnut', 'polarArea', 'radar', 'bubble', 'scatter'];

let chartType = writable('line'); // Default to 'line'

  /**
   * @param {string} newType
   */
function setChartType(newType) {
    if (validChartTypes.includes(newType)) {
        chartType.set(newType);
    } else {
        console.error('Invalid chart type:', newType);
    }
}

let chartData = writable({});
/** @type {Chart | null} */
let chart = null;
/** @type {HTMLCanvasElement | null} */
let canvas = null;
let borderColor = writable('#000000');
let selectedColumns = writable(new Set());
let selectedXColumn = writable('id');
let selectedYColumn = writable('id');
let columnOptions = derived(all_surveys, $all_surveys => {
    console.log("Updating column options from surveys", $all_surveys);
    return $all_surveys.length > 0 ? Object.keys($all_surveys[0]) : [];
});

    $: if (chartType) initializeChart(); // Reactive declaration to re-initialize the chart when type changes

onMount(() => {
    canvas = document.querySelector('canvas');
    if (canvas) initializeChart();
});
function initializeChart() {
    if (chart) chart.destroy(); // Clean up any existing chart instances

    if (!canvas) {
        console.error('Canvas element is not available');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
    }

    chart = new Chart(ctx, {
        type: $chartType, // Directly use Svelte's reactive variable
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true } },
            plugins: {
                legend: { position: 'top' },
                tooltip: { enabled: true }
            }
        }
    });
}

    function getSelectedData(data: any[], selectedCols: Set<string>) { // Retrieves selected data based on column selections
        if (data.length === 0 || selectedCols.size === 0) return [];
        const colIndexes = Array.from(selectedCols).map(header => data[0].indexOf(header));
        return data.map(row => colIndexes.map(index => row[index]));
    }


    function toggleColumn(column) {
        selectedColumns.update(current => {
            const newSet = new Set(current);
            if (newSet.has(column)) newSet.delete(column);
            else newSet.add(column);
            return newSet;
        });
    }
function updateChartColor() {
    const colorPicker = document.getElementById('borderColorPicker');
    if (colorPicker) {
        const newColor = colorPicker.value;
        borderColor.set(newColor);
        createChart(); // Re-create the chart with the new color
    } else {
        console.error('Color picker element not found');
    }
}

$: borderColor, () => { // Updates chart's border color
    if (chart && $borderColor) {
        chart.data.datasets.forEach(dataset => {
            dataset.borderColor = $borderColor;
        });
        chart.update();
    }
};

function createChart() {
    if (!selectedXColumn || !selectedYColumn) {
        console.error('X-axis or Y-axis not selected');
        return;
    }

    // Ensure canvas context is available
    if (!canvas) {
        console.error('Canvas element is not available');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
    }

    // Destroy existing chart instance if present
    if (chart) chart.destroy();

    // Prepare data for the chart based on selected columns
    const labels = $all_surveys.map(item => item[$selectedXColumn]);
    const dataPoints = $all_surveys.map(item => item[$selectedYColumn]);

    const backgroundColors = dataPoints.map((_, index) => segmentColors[index % segmentColors.length]);

    // Create a new chart with the selected data
    chart = new Chart(ctx, {
        type: $chartType,
        data: {
            labels: labels,
            datasets: [{
                label: `${selectedXColumn} vs ${selectedYColumn}`,
                data: dataPoints,
                backgroundColor: backgroundColors,
                borderColor: $borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(0, 0, 0, .7)',
                    },
                    title: {
                        display: true,
                        text: $selectedXColumn,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(0, 0, 0, .7)',
                    },
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: $selectedYColumn,
                        font: {
                            size: 16,
                            weight: 'bold',
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    enabled: true
                },
                title: {
                    display: true,
                    text: `${selectedXColumn} vs ${selectedYColumn}`, // Chart title
                    font: {
                        size: 24,
                        weight: 'bold'
                    },
                    padding: 20,
                    align: 'center'
                }
            }
        }
    });

    chart.update();
}


onDestroy(() => {
        if (chart) chart.destroy();
    });

function downloadChart() { // Downloads the chart as an image
    if (chart) {
        const imageUrl = chart.toBase64Image(); 
        const downloadLink = document.createElement('a');
        downloadLink.href = imageUrl; 
        downloadLink.download =  "my_chart.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } else {
        console.log("No chart available to download");
    }
}

</script>

<div class="mainContainer">
    <div class="headerContainer">
        <h1>Visualize Data</h1>
   
</div>
    <div class="controls">
        <label for="chartType">Chart Type:</label>
        <select id="chartType" bind:value={$chartType}>
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
        </select>
    </div>

    <div class="controls">
        <label for="xAxis">X-Axis:</label>
        <select bind:value={$selectedXColumn} id="xAxis">
            {#each $columnOptions as column}
                <option value="{column}">{column}</option>
            {/each}
        </select>
    
        <label for="yAxis">Y-Axis:</label>
        <select bind:value={$selectedYColumn} id="yAxis">
            {#each $columnOptions as column}
                <option value="{column}">{column}</option>
            {/each}
        </select>
    </div>

    <label for="borderColorPicker">Choose Graph Color:</label>
    <input type="color" id="borderColorPicker"bind:value={$borderColor}>
    <button class="colorButton" on:click={updateChartColor}>Update Color</button>
    <p>Click <strong>Visualize Data</strong> after selecting your axes and color to see your chart! </p><br>
    <button class = "button" on:click={createChart}>Visualize Data</button><br>
    <button class = "button" on:click={downloadChart}>Download Chart</button>
    <canvas bind:this={canvas}></canvas>
</div>


<style>

.headerContainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.button {
    font-family:  "Arapey", serif;
        background: darkorchid;
        color: white;
        border: none;
        padding: 1em;
        width: 10%;
        border-radius: 1em;
        cursor: pointer;
        font-size: 1rem;
        display: grid;
        place-items: center;
    }

   .button:hover {
        background: plum;
    }
    .colorButton {
        font-family:  "Arapey", serif;
        background: darkorchid;
        color: white;
        border: none;
        padding: 1em;
        width: 6%;
        border-radius: 1em;
        cursor: pointer;
        font-size: .8rem;
        display: grid;
        place-items: center;
        margin: .3125em;
    }

   .colorButton:hover {
        background: plum;
    }
    canvas {
      width: 100%;
      height: 25em;
      background-color: white;
    }
.controls{
    font-family: "Arapey", serif;
}
  </style>
 -->
