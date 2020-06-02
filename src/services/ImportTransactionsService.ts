/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import Category from '../models/Category';

interface TransactionsDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);
    const csvPath = path.join(uploadConfig.directory, filename);
    const contactsReadStream = fs.createReadStream(csvPath);

    const parsers = csvParse({
      from_line: 2,
      rtrim: true,
      ltrim: true,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: TransactionsDTO[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(category => {
      return category.title;
    });

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => {
        return { title };
      }),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => {
        return {
          title: transaction.title,
          type: transaction.type,
          value: transaction.value,
          category: finalCategories.find(
            category => category.title === transaction.category,
          ),
        };
      }),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(csvPath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
