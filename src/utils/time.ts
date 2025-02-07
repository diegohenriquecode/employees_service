export async function randomSleep(max = 1000) {
    const timeout = Math.round(Math.random() * max);
    console.log(`sleeping for ${timeout}ms`);
    return sleep(timeout);
}

export async function sleep(timeout: number) {
    console.log(`sleeping for ${timeout}ms`);
    return new Promise(resolve => setTimeout(resolve, timeout));
}
