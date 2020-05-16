import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    if (type !== 'income' && type !== 'outcome') {
      throw new AppError("Transactions' type invalid");
    }

    const transactionRepostory = getCustomRepository(TransactionsRepository);
    const { total } = await transactionRepostory.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('Your account does not have enough funds.');
    }

    const categoryRepository = getRepository(Category);
    let category = await categoryRepository.findOne({ title: categoryTitle });

    if (!category) {
      category = categoryRepository.create({ title: categoryTitle });
      await categoryRepository.save(category);
    }

    const transaction = transactionRepostory.create({
      title,
      value,
      type,
      category,
    });

    await transactionRepostory.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
