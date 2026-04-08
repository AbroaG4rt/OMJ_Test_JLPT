// assets/js/result.js

document.addEventListener('DOMContentLoaded', async () => {
    if (!OmoshiroiUtils.requireAuth()) return;

    const user = OmoshiroiUtils.getUser();
    const resultData = JSON.parse(localStorage.getItem('omoshiroi_latest_result'));

    if (!resultData) {
        window.location.href = 'dashboard.html';
        return;
    }

    const { level, answers, cheatProfile, timestamp } = resultData;

    try {
        // Fetch Answer Key
        const response = await fetch(`data/${level}.json`);
        const allQuestions = await response.json();

        // SCORING LOGIC
        let correctCount = 0;
        let evaluation = [];
        const totalCount = allQuestions.length;

        allQuestions.forEach(q => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            if (isCorrect) correctCount++;

            evaluation.push({
                id: q.id,
                question: q.question,
                userAns: userAns || null,
                correctAnswer: q.correctAnswer,
                isCorrect: isCorrect
            });
        });

        const score = (correctCount / totalCount) * 100;

        // Save to History natively here (protect against duplicates via timestamp)
        let history = JSON.parse(localStorage.getItem('omoshiroi_history') || '[]');
        if (!history.find(h => h.timestamp === timestamp)) {
            history.push({ level: level, score: score, timestamp: timestamp });
            localStorage.setItem('omoshiroi_history', JSON.stringify(history));
        }

        // --- DOM POPULATION ---
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

        // --- CHART JS ---
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
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // --- PDF EXPORT LOGIC ---
        document.getElementById('downloadPdfBtn').addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // HEADER
            doc.setFontSize(22);
            doc.setTextColor(209, 48, 48); // var(--primary-color)
            doc.text("OMOSHIROI JAPAN TEST PLATFORM", 15, 20);

            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("JLPT Examination Report", 15, 30);

            // USER INFO 
            doc.setFontSize(12);
            doc.text(`Examinee Name: ${user.name}`, 15, 45);
            doc.text(`Password Key: ${user.password || 'N/A'}`, 15, 52);
            doc.text(`Test Level: JLPT ${level}`, 15, 59);
            doc.text(`Date completed: ${new Date(timestamp).toLocaleString()}`, 15, 66);

            // SCORE INFO
            doc.setFontSize(14);
            doc.text("Performance Summary:", 15, 80);

            doc.setFontSize(20);
            doc.setTextColor(0, 0, 0);
            doc.text(`Final Score: ${score.toFixed(1)}%`, 15, 90);

            doc.setFontSize(12);
            doc.text(`Correct Answers: ${correctCount} / ${totalCount}`, 15, 98);
            doc.text(`Evaluation Badge: ${badgeText}`, 15, 105);

            // CORRECT ANSWERS LIST (Preview)
            doc.setFontSize(14);
            doc.setTextColor(209, 48, 48);
            doc.text("Answer Key Review (Preview):", 15, 120);

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);

            let yPos = 130;
            let pagedQuestions = evaluation.slice(0, 40);

            pagedQuestions.forEach((item) => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }
                const statusMark = item.isCorrect ? "✅ Correct" : `❌ (Expected: ${item.correctAnswer})`;
                doc.text(`${item.id} - Your Ans: ${item.userAns || 'None'} | ${statusMark}`, 15, yPos);
                yPos += 7;
            });

            // WATERMARK IN FRONT (drawn last so it sits on top)
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.15 }));
            doc.setFontSize(50);
            doc.setTextColor(200, 200, 200);
            doc.text("test omoshiroi japan", pageWidth / 2, pageHeight / 2, { angle: 45, align: "center" });
            doc.restoreGraphicsState();

            doc.save(`OMOSHIROI_JLPT_${level}_${user.name.replace(/\s+/g, '_')}.pdf`);
        });

        // --- HTTP POST API LOGIC ---
        const emailFormToggleBtn = document.getElementById('emailFormToggleBtn');
        const emailFormContainer = document.getElementById('emailFormContainer');
        const emailSubmitForm = document.getElementById('emailSubmitForm');

        emailFormToggleBtn.addEventListener('click', () => {
            emailFormContainer.classList.toggle('hidden');
        });

        // Direct Fetch / AJAX POST handler
        emailSubmitForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = emailSubmitForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Sending...";
            submitBtn.disabled = true;

            const payload = {
                name: user.name,
                password: user.password,
                level: level,
                score: score.toFixed(1),
                correctList: evaluation.filter(q => q.isCorrect).map(q => q.id),
                cheatProfile: cheatProfile
            };

            try {
                const workerResponse = await fetch('/api/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const jsonResult = await workerResponse.json();

                if (!workerResponse.ok) throw new Error(jsonResult.error || "Unknown Error");

                alert(`✅ Successfully submitted report to Organization!\n\nMessage: ${jsonResult.message}`);
                emailFormContainer.classList.add('hidden');
            } catch (err) {
                console.error("Worker Post Failed:", err);
                alert(`❌ Failed to send report.\n\nEnsure Cloudflare Worker is connected via /api/send`);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // --- BARCODE AND WHATSAPP LOGIC ---
        let qrGenerated = false;
        document.getElementById('shareTestBtn').addEventListener('click', () => {
            const qrContainerWrapper = document.getElementById('qrContainerWrapper');
            qrContainerWrapper.classList.toggle('hidden');

            if (!qrGenerated) {
                const shareUrl = window.location.origin + window.location.pathname.replace('result.html', `dashboard.html`);
                new QRCode(document.getElementById("qrcode"), {
                    text: shareUrl,
                    width: 150, height: 150,
                    colorDark: "#2c2c2c", colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                qrGenerated = true;
            }
        });

        document.getElementById('downloadQrBtn').addEventListener('click', () => {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (qrCanvas) {
                const tempLink = document.createElement('a');
                tempLink.download = 'omoshiroi_test_qr.png';
                tempLink.href = qrCanvas.toDataURL('image/png');
                tempLink.click();
            }
        });

        const whatsappBtn = document.getElementById('whatsappFloat');
        if (whatsappBtn) {
            const phoneNo = "+62881036289081";
            const waText = encodeURIComponent(`Hello Omoshiroi Japan, I have just completed the JLPT ${level} examination.\n\nMy Score: ${score.toFixed(1)}%\nName: ${user.name}`);
            whatsappBtn.href = `https://wa.me/${phoneNo}?text=${waText}`;
        }

    } catch (e) {
        console.error("Failed to load result layout properly:", e);
        alert("Failed to render results properly. Please ensure test data exists.");
    }
});
