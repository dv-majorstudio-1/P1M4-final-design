// 1. Take the JSON
// 2. Go through all the elements
// 3. Take content.freetext.date.content when the label is "Accession Date", and also when it is "Collection Date"
// 4. Take content.freetext.name.content when the label is "Site Name", and also when it is "Donor Name"
// 5. Check if it is salvage: it has "Reservoir" as place or "River Basin" as donor
// 6. If it is not salvage, or it doesn't have a site name, an accession date or a collection date, skip it
// 7. From the accession date and the collection date take the last four digits and transform them into numbers
// 8. Look for the site in the list of sites. If it isn't there, create it with these two dates
// 9. Count one more lot for this site
// 10. Sort the sites by the oldest collection year
// 11. For each site, in a new row:
// 12. Draw a line between the collection date and the accession date
// 13. Draw a dot at the collection date and another one at the accession date
// 14. Write the site name and the number of lots to the left


// 
// A. LOAD THE DATA
// 
const dataResponse = await fetch("data.json");
const allMiscObjects = await dataResponse.json();


// 
// B. FIND THE SALVAGE SITES
// 

// One entry per excavation site
const salvageSites = [];

// Go through all the elements
for (let objectIndex = 0; objectIndex < allMiscObjects.length; objectIndex++) {
  const miscObject = allMiscObjects[objectIndex];

  // Lists of dates, places and names (empty list if the object doesn't have them)
  let allObjectDates = [];
  if (miscObject.content.freetext.date !== undefined) {
    allObjectDates = miscObject.content.freetext.date;
  }
  let allObjectPlaces = [];
  if (miscObject.content.freetext.place !== undefined) {
    allObjectPlaces = miscObject.content.freetext.place;
  }
  let allObjectNames = [];
  if (miscObject.content.freetext.name !== undefined) {
    allObjectNames = miscObject.content.freetext.name;
  }

  // Accession date and collection date
  let accessionDateAsText = null;
  let collectionDateAsText = null;
  for (let dateIndex = 0; dateIndex < allObjectDates.length; dateIndex++) {
    if (allObjectDates[dateIndex].label === "Accession Date") {
      accessionDateAsText = allObjectDates[dateIndex].content;
    }
    if (allObjectDates[dateIndex].label === "Collection Date") {
      collectionDateAsText = allObjectDates[dateIndex].content;
    }
  }

  // Site name and donor name
  let siteName = null;
  let donorName = "";
  for (let nameIndex = 0; nameIndex < allObjectNames.length; nameIndex++) {
    if (allObjectNames[nameIndex].label === "Site Name") {
      siteName = allObjectNames[nameIndex].content;
    }
    if (allObjectNames[nameIndex].label === "Donor Name") {
      donorName = allObjectNames[nameIndex].content;
    }
  }

  // Is it salvage? "Reservoir" as place or "River Basin" as donor
  let isSalvageObject = false;
  for (let placeIndex = 0; placeIndex < allObjectPlaces.length; placeIndex++) {
    if (allObjectPlaces[placeIndex].content.includes("Reservoir")) {
      isSalvageObject = true;
    }
  }
  if (donorName.includes("River Basin")) {
    isSalvageObject = true;
  }

  // Skip it if it is not salvage, or if something is missing
  if (isSalvageObject === false) continue;
  if (siteName === null) continue;
  if (accessionDateAsText === null) continue;
  if (collectionDateAsText === null) continue;

  // Years: the last four digits of each date
  const registrationYear = Number(accessionDateAsText.slice(-4));
  const collectionYear = Number(collectionDateAsText.slice(-4));

  // Look for the site in our list
  let salvageSite = null;
  for (let siteIndex = 0; siteIndex < salvageSites.length; siteIndex++) {
    if (salvageSites[siteIndex].siteName === siteName) {
      salvageSite = salvageSites[siteIndex];
    }
  }

  // If it isn't there yet, create it with the years of this object
  if (salvageSite === null) {
    salvageSite = {
      siteName: siteName,
      numberOfObjects: 0,
      collectionYear: collectionYear,
      registrationYear: registrationYear
    };
    salvageSites.push(salvageSite);
  }

  // Count one more object for this site
  salvageSite.numberOfObjects = salvageSite.numberOfObjects + 1;
}

// Sort the sites by collection year (oldest first)
for (let firstIndex = 0; firstIndex < salvageSites.length; firstIndex++) {
  for (let secondIndex = firstIndex + 1; secondIndex < salvageSites.length; secondIndex++) {
    if (salvageSites[secondIndex].collectionYear < salvageSites[firstIndex].collectionYear) {
      const temporarySite = salvageSites[firstIndex];
      salvageSites[firstIndex] = salvageSites[secondIndex];
      salvageSites[secondIndex] = temporarySite;
    }
  }
}

console.log("Salvage sites:", salvageSites); // should be 9 sites


// 
// C. DRAW THE DUMBBELLS
// 

const chartWidth = 1000;
const chartLeftMargin = 180;     // room for the site names
const chartRightMargin = 30;
const chartTopMargin = 20;
const siteRowHeight = 30;
const chartHeight = chartTopMargin + salvageSites.length * siteRowHeight + 40;
const dumbbellColour = "#1d6b78";

const chartSvg = d3.select("#chart").append("svg")
  .attr("viewBox", "0 0 " + chartWidth + " " + chartHeight);

// Scale: turns a year into a horizontal position
const yearToXPosition = d3.scaleLinear()
  .domain([1940, 1990])
  .range([chartLeftMargin, chartWidth - chartRightMargin]);

// Axis of years, under the last row
chartSvg.append("g")
  .attr("transform", "translate(0, " + (chartTopMargin + salvageSites.length * siteRowHeight) + ")")
  .call(d3.axisBottom(yearToXPosition).tickFormat(d3.format("d")));

// One row per site
for (let siteIndex = 0; siteIndex < salvageSites.length; siteIndex++) {
  const salvageSite = salvageSites[siteIndex];
  const rowYPosition = chartTopMargin + siteIndex * siteRowHeight;
  const collectionX = yearToXPosition(salvageSite.collectionYear);
  const registrationX = yearToXPosition(salvageSite.registrationYear);

  // Line: the wait, from collection to registration
  chartSvg.append("line")
    .attr("x1", collectionX)
    .attr("x2", registrationX)
    .attr("y1", rowYPosition)
    .attr("y2", rowYPosition)
    .attr("stroke", dumbbellColour)
    .attr("stroke-width", 2);

  // Dot: collection
  chartSvg.append("circle")
    .attr("cx", collectionX)
    .attr("cy", rowYPosition)
    .attr("r", 5)
    .attr("fill", dumbbellColour);

  // Dot: registration
  chartSvg.append("circle")
    .attr("cx", registrationX)
    .attr("cy", rowYPosition)
    .attr("r", 5)
    .attr("fill", dumbbellColour);

  // Site name and number of objects, to the left
  chartSvg.append("text")
    .attr("x", chartLeftMargin - 20)
    .attr("y", rowYPosition + 4)
    .attr("text-anchor", "end")
    .attr("font-size", 12)
    .text(salvageSite.siteName + " (" + salvageSite.numberOfObjects + ")");
}