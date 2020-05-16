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

    const { income, outcome } = transactions.reduce(
      (prevValue, item) => {
        if (item.type === 'income') {
          prevValue.income += item.value;
        } else {
          prevValue.outcome += item.value;
        }

        return prevValue;
      },
      {
        income: 0,
        outcome: 0,
      },
    );

    const total = income - outcome;
    return { income, outcome, total };
  }
}

export default TransactionsRepository;
