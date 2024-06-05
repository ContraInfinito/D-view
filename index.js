import DerivAPIBasic from "https://cdn.skypack.dev/@deriv/deriv-api/dist/DerivAPIBasic";

const app_id = 62002;
const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);
const api = new DerivAPIBasic({ connection });

let token = "";
let numberOfBuys = 0;
let symbol = "BOOM500";
let entryPrice = 2000;

const contracts_for_symbol_request = {
    contracts_for: symbol,
    currency: "USD",
    landing_company: "svg",
    product_type: "basic",
};

const price_proposal = {
    amount: 2000,
    basis: "stake",
    contract_type: "MULTUP",
    currency: "USD",
    duration_unit: "s",
    multiplier: 400,
    product_type: "basic",
    proposal: 1,
    req_id: 11,
    symbol: symbol,
};

let buy_contract_request = {
    buy: "",
    price: 2000,
    req_id: 12,
};

const outputDiv = document.getElementById("output");

const loginResponse = async (res) => {
    const data = JSON.parse(res.data);

    if (data.error !== undefined) {
        outputDiv.innerHTML += `<p>Error: ${data.error.message}</p>`;
        await api.disconnect();
    } else if (data.msg_type === "authorize") {
        outputDiv.innerHTML += "<p>Authentication successful.</p>";
        connection.removeEventListener("message", loginResponse);

        // After authentication, get contracts and proposals.
        getContractsForSymbol();
    }
};

const contractsForSymbolResponse = async (res) => {
    const data = JSON.parse(res.data);

    if (data.error !== undefined) {
        outputDiv.innerHTML += `<p>Error: ${data.error.message}</p>`;
        connection.removeEventListener("message", contractsForSymbolResponse);
        await api.disconnect();
    } else if (data.msg_type === "contracts_for") {
        outputDiv.innerHTML += `<p>Contracts for symbol: ${JSON.stringify(data.contracts_for)}</p>`;
        connection.removeEventListener("message", contractsForSymbolResponse);
    }
};

const priceProposalResponse = async (res) => {
    const data = JSON.parse(res.data);
    if (data.error !== undefined) {
        outputDiv.innerHTML += `<p>Error: ${data.error.message}</p>`;
        connection.removeEventListener("message", priceProposalResponse);
        await api.disconnect();
    } else if (data.msg_type === "proposal") {
        outputDiv.innerHTML += `<p>Proposal: ${JSON.stringify(data.proposal)}</p>`;
        buy_contract_request.buy = data.proposal.id;
        connection.addEventListener("message", buyContractResponse);
        await api.buy(buy_contract_request);
        connection.removeEventListener("message", priceProposalResponse);
    }
};

const buyContractResponse = async (res) => {
    const data = JSON.parse(res.data);
    if (data.error !== undefined) {
        outputDiv.innerHTML += `<p>Error: ${data.error.message}</p>`;
    } else {
        outputDiv.innerHTML += `<p>Buy successful: ${JSON.stringify(data.buy)}</p>`;
    }
    connection.removeEventListener("message", buyContractResponse);
    await api.disconnect();
};

const getContractsForSymbol = async () => {
    connection.addEventListener("message", contractsForSymbolResponse);
    await api.contractsFor(contracts_for_symbol_request);

    for (let i = 0; i < numberOfBuys; i++) {
        connection.addEventListener("message", priceProposalResponse);
        await api.proposal(price_proposal);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait one second between proposals
    }
};

const authenticate = async () => {
    connection.addEventListener("message", loginResponse);
    await api.authorize(token);
};

const checkToken = async () => {
    token = document.getElementById("token").value;
    await authenticate();
};

const startTrading = async () => {
    token = document.getElementById("token").value;
    symbol = document.getElementById("symbol").value;
    entryPrice = parseFloat(document.getElementById("price").value);
    numberOfBuys = parseInt(document.getElementById("numberOfBuys").value);

    price_proposal.contract_type = symbol.startsWith("BOOM") ? "MULTUP" : "MULTDOWN";
    price_proposal.symbol = symbol;
    buy_contract_request.price = entryPrice;

    await authenticate();
};

document.getElementById("checkToken").addEventListener("click", checkToken);
document.getElementById("startTrading").addEventListener("click", startTrading);
