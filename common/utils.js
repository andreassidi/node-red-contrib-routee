module.exports = async function (node, status, delay) {

    if (status === 'delivered') {
        node.status({ fill: 'green', shape: 'dot', text: 'Message delivered' });
    }

    if (status === 'failed') {
        node.status({ fill: 'red', shape: 'dot', text: 'An error has occurred' });
    }

    if (status === 'standby') {
        node.status({ fill: 'grey', shape: 'dot', text: 'Stand by' });
    }

    setTimeout(() => { node.status({ fill: 'grey', shape: 'dot', text: 'Stand by' }) }, delay);
}
