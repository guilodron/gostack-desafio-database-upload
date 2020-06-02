import { getCustomRepository, getRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && balance.total - value < 0) {
      throw new AppError('Saldo insuficiente');
    }

    let id = '';

    const existingCategory = await categoriesRepository.findOne({
      title: category,
    });
    if (!existingCategory) {
      const savedCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(savedCategory);
      id = savedCategory.id;
    } else {
      id = existingCategory.id;
    }
    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: id,
    });
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
