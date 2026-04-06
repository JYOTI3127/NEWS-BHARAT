document.addEventListener("DOMContentLoaded", function () {

    const dataDiv = document.getElementById("chart-data");

    if (!dataDiv) return;

    const draft = parseInt(dataDiv.dataset.draft) || 0;
    const published = parseInt(dataDiv.dataset.published) || 0;
    const rejected = parseInt(dataDiv.dataset.rejected) || 0;

    const ctx = document.getElementById("statusChart");

    if (!ctx) return;

    new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Draft", "Published", "Rejected"],
            datasets: [{
                data: [draft, published, rejected],
                backgroundColor: ["#3b82f6", "#10b981", "#ef4444"],
                borderWidth: 0
            }]
        },
        options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "bottom"
        }
    }
}

    });

});
