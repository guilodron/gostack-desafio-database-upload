import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const outcome = transactions
      .filter(transaction => {
        return transaction.type === 'outcome';
      })
      .reduce((previous, current) => previous + Number(current.value), 0);
    const income = transactions
      .filter(transaction => {
        return transaction.type === 'income';
      })
      .reduce((previous, current) => previous + Number(current.value), 0);

    return {
      income: Number(income),
      outcome: Number(outcome),
      total: Number(income) - Number(outcome),
    };
  }
}

export default TransactionsRepository;
