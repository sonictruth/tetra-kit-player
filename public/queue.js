class ZQueue {
    constructor({ max = 10 } = {}) {
        this.max = max;

        this.queue = [];
        this.inProgress = [];
    }

    run(work, { topPriority = false } = {}) {
        const result = new Promise((resolve, reject) => {
            const worker = () =>
                Promise.resolve()
                    .then(() => work())
                    .then(resolve)
                    .catch(reject);

            if (topPriority) {
                this.queue.unshift(worker);
            } else {
                this.queue.push(worker);
            }
        });

        this._process();

        return result;
    }

    _process() {
        while (this.inProgress.length < this.max && this.queue.length > 0) {
            const worker = this.queue.shift();

            this.inProgress.push(worker);
            worker()
                .then(() => {
                    this.inProgress = this.inProgress.filter(w => w !== worker);
                    this._process();
                })
                .catch(err => {
                    this.inProgress = this.inProgress.filter(w => w !== worker);
                    this._process();
                    throw err;
                });
        }
    }
}
