
const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";

async function checkHealth() {
  try {
    const response = await fetch(`${baseUrl}/api/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.ok !== true) {
      throw new Error("Unexpected health response");
    }

    console.log("PASS: ReSell Hub backend is healthy");
  } catch (error) {
    console.error("FAIL: Backend health check:", error.message);
    process.exitCode = 1;
  }
}

checkHealth();
