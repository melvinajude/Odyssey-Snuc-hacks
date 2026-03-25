document.addEventListener("DOMContentLoaded", () => {
    const transactionList = document.querySelector('.transaction-list');
    
    const transactions = [
        { name: 'Apple Inc.', date: 'Today, 2:45 PM', amount: '+$1,200.00', type: 'positive' },
        { name: 'Spotify Premium', date: 'Yesterday, 9:20 AM', amount: '-$9.99', type: 'negative' },
        { name: 'Freelance Payout', date: 'Oct 12, 10:00 AM', amount: '+$3,450.00', type: 'positive' }
    ];

    transactions.forEach(t => {
        const item = document.createElement('div');
        item.className = 'transaction';
        
        item.innerHTML = `
            <div class="t-info">
                <h4>${t.name}</h4>
                <p>${t.date}</p>
            </div>
            <div class="t-amount t-${t.type}">${t.amount}</div>
        `;
        
        transactionList.appendChild(item);
    });
});
