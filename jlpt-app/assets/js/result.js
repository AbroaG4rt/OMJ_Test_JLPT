// assets/js/result.js

document.addEventListener('DOMContentLoaded', () => {
    if (!OmoshiroiUtils.requireAuth()) return;

    const user = OmoshiroiUtils.getUser();
    const resultData = JSON.parse(localStorage.getItem('omoshiroi_latest_result'));

    if (!resultData) {
        window.location.href = 'dashboard.html';
        return;
    }

    const { level, score, correctCount, totalCount, evaluation, cheatProfile } = resultData;

    // Security Display logic
    if (cheatProfile) {
        const cBadge = document.getElementById('cheatScoreBadge');
        if (cheatProfile.score >= 6) {
            cBadge.textContent = "High Risk";
            cBadge.className = "badge badge-fail";
        } else if (cheatProfile.score >= 3) {
            cBadge.textContent = "Suspicious";
            cBadge.className = "badge badge-master"; 
        } else {
            cBadge.textContent = "Safe";
            cBadge.className = "badge badge-pass";
        }
        
        document.getElementById('cheatStatsList').innerHTML = `
            <li style="margin-bottom: 0.5rem;">Tab Switches: <strong>${cheatProfile.tabSwitches}</strong></li>
            <li style="margin-bottom: 0.5rem;">Copy Attempts: <strong>${cheatProfile.copyAttempts}</strong></li>
            <li style="margin-bottom: 0.5rem;">Screenshot Attempts: <strong>${cheatProfile.screenshotAttempts}</strong></li>
            <li>DevTools Attempts: <strong>${cheatProfile.devToolsAttempts}</strong></li>
        `;
    }

    // UI population
    document.getElementById('levelDisplay').textContent = level;
    document.getElementById('scoreDisplay').textContent = `${score.toFixed(1)}%`;
    document.getElementById('fractionDisplay').textContent = `${correctCount} / ${totalCount} Correct`;

    const badgeDisplay = document.getElementById('badgeDisplay');
    let badgeClass = 'badge-fail';
    let badgeText = "Don't Give Up";
    if (score >= 80) { badgeClass = 'badge-master'; badgeText = "JLPT Master"; }
    else if (score >= 50) { badgeClass = 'badge-pass'; badgeText = "Keep Going"; }
    
    badgeDisplay.className = `badge ${badgeClass} mt-1`;
    badgeDisplay.textContent = badgeText;

    const quotes = [
        "努力は必ず報われる - Hard work always pays off.",
        "失敗は成功のもと - Failure is the stepping stone to success.",
        "一期一会 - Once in a lifetime encounter.",
        "明日は明日の風が吹く - Tomorrow's winds will blow tomorrow (Tomorrow is a new day)."
    ];
    document.getElementById('motivationalQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)];

    // Render Chart
    const ctx = document.getElementById('resultChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Wrong/Unanswered'],
            datasets: [{
                data: [correctCount, totalCount - correctCount],
                backgroundColor: ['#2b8a3e', '#eaeaea'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // PDF Export Logic
    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Settings
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. WATERMARK - Draw it first so it's behind
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.setFontSize(50);
        doc.setTextColor(200, 200, 200); // light gray
        // Rotate and write
        doc.text("test omoshiroi japan", pageWidth/2, pageHeight/2, { angle: 45, align: "center" });
        doc.restoreGraphicsState();

        // 2. HEADER
        doc.setFontSize(22);
        doc.setTextColor(209, 48, 48); // var(--primary-color)
        doc.text("OMOSHIROI JAPAN TEST PLATFORM", 15, 20);

        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text("JLPT Examination Report", 15, 30);

        // 3. USER INFO 
        doc.setFontSize(12);
        doc.text(`Examinee Name: ${user.name}`, 15, 45);
        doc.text(`Password Key: ${user.password || 'N/A'}`, 15, 52); 
        doc.text(`Test Level: JLPT ${level}`, 15, 59);
        doc.text(`Date completed: ${new Date(resultData.timestamp).toLocaleString()}`, 15, 66);

        // 4. SCORE INFO (Watermark is behind this as requested)
        doc.setFontSize(14);
        doc.text("Performance Summary:", 15, 80);
        
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(`Final Score: ${score.toFixed(1)}%`, 15, 90);
        
        doc.setFontSize(12);
        doc.text(`Correct Answers: ${correctCount} / ${totalCount}`, 15, 98);
        doc.text(`Evaluation Badge: ${badgeText}`, 15, 105);

        // 5. CORRECT ANSWERS LIST (Preview)
        doc.setFontSize(14);
        doc.setTextColor(209, 48, 48);
        doc.text("Answer Key Review (Preview):", 15, 120);
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        
        let yPos = 130;
        let pagedQuestions = evaluation.slice(0, 40); // limit to 40 for brevity in single page

        pagedQuestions.forEach((item, index) => {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
            }
            const statusMark = item.isCorrect ? "✅ Correct" : `❌ (Expected: ${item.correctAnswer})`;
            doc.text(`${item.id} - Your Ans: ${item.userAns || 'None'} | ${statusMark}`, 15, yPos);
            yPos += 7;
        });

        doc.save(`OMOSHIROI_JLPT_${level}_${user.name.replace(/\s+/g,'_')}.pdf`);
    });

    // Share / Barcode Logic
    let qrGenerated = false;
    document.getElementById('shareTestBtn').addEventListener('click', () => {
        const qrContainerWrapper = document.getElementById('qrContainerWrapper');
        qrContainerWrapper.classList.toggle('hidden');

        if (!qrGenerated) {
            // Generate QR containing URL of current test (e.g. the site's base URL + test params)
            const shareUrl = window.location.origin + window.location.pathname.replace('result.html', `dashboard.html`);
            
            new QRCode(document.getElementById("qrcode"), {
                text: shareUrl,
                width: 150,
                height: 150,
                colorDark : "#2c2c2c",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            qrGenerated = true;
        }
    });

    // Download QR Code image
    document.getElementById('downloadQrBtn').addEventListener('click', () => {
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (qrCanvas) {
            const tempLink = document.createElement('a');
            tempLink.download = 'omoshiroi_test_qr.png';
            tempLink.href = qrCanvas.toDataURL('image/png');
            tempLink.click();
        }
    });

    // Email Worker / Form integration
    const emailFormToggleBtn = document.getElementById('emailFormToggleBtn');
    const emailFormContainer = document.getElementById('emailFormContainer');
    const payloadDataInput = document.getElementById('payloadData');
    
    emailFormToggleBtn.addEventListener('click', () => {
        emailFormContainer.classList.toggle('hidden');

        // Compile payload for Cloudflare Worker
        const payload = {
            name: user.name,
            password: user.password,
            level: level,
            score: score.toFixed(1),
            correctList: evaluation.filter(q => q.isCorrect).map(q => q.id),
            cheatProfile: cheatProfile // Attached for Cloudflare format execution
        };
        // Encode state into hidden input just in case traditional form submit is used
        payloadDataInput.value = JSON.stringify(payload);
    });

    // WhatsApp dynamic intent preparation
    const whatsappBtn = document.getElementById('whatsappFloat');
    if (whatsappBtn) {
        const phoneNo = "819012345678"; // Representative default mock number
        const waText = encodeURIComponent(`Hello Omoshiroi Japan, I have just completed the JLPT ${level} examination.\n\nMy Score: ${score.toFixed(1)}%\nName: ${user.name}`);
        whatsappBtn.href = `https://wa.me/${phoneNo}?text=${waText}`;
    }

    // We can also intercept the form submit to perform AJAX to the worker. 
    // Here we use native submission as requested by the user plan.
});
