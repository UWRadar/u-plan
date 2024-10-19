async function inject() {
	await sleep(1000);
	const newIframe = document.createElement("iframe");
	let courseInfo = await tryQuerySelector("h1");
	if (
		!courseInfo ||
		!courseInfo.textContent ||
		courseInfo.textContent === "Find Courses"
	) {
		return;
	}
	// Split the course name based on spaces
	const courseInfoArray = courseInfo.textContent.split(" ");

	// Find the last element that is the course number
	const courseNumIndex = courseInfoArray.findIndex((part) => !isNaN(parseInt(part)));

	// If there's no valid course number, exit the function
	if (courseNumIndex === -1) {
		return;
	}

	// Join everything before the course number as the course abbreviation (e.g., "GEN ST")
	const courseName = courseInfoArray.slice(0, courseNumIndex).join(" ");

	// Join the course abbreviation and number (e.g., "GENST199")
	const courseNum = `${courseInfoArray.slice(0, courseNumIndex).join("")}${courseInfoArray[courseNumIndex]}`;
	
	const iframeId = "u-plan";
	const existingIframe = document.getElementById(iframeId);
	const iframeUrl = `https://uwclassmate.com/CourseDetail/${courseNum}`;
	if (existingIframe) {
		if (existingIframe.src === iframeUrl) {
			return;
		} else {
			existingIframe.remove();
		}
	}
	newIframe.id = iframeId;
	newIframe.src = iframeUrl;
	newIframe.style.height = "500px";
	newIframe.style.width = "100%";
	const cdpCourseDetails = await tryQuerySelector(".cdpCourseDetails");
	if (!cdpCourseDetails) {
		return;
	}
	cdpCourseDetails.appendChild(newIframe);
}

function sleep(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}

async function tryQuerySelector(selector) {
	let element = document.querySelector(selector);
	let attempts = 0;
	while (attempts < 20 && !element) {
		await sleep(1000);
		element = document.querySelector(selector);
		attempts++;
	}
	return element;
}

// onhashchange does not work
let lastCourseId = null;
setInterval(() => {
	const hashUrl = new URL(
		window.location.hash.substring(1),
		window.location.href
	);
	const courseId = hashUrl.searchParams.get("id");
	if (courseId !== lastCourseId) {
		lastCourseId = courseId;
		if (courseId) {
			inject();
		}
	}
}, 1000);
