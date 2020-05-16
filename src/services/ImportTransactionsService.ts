import csvParse from 'csv-parse';
import fs from 'fs';

import { getCustomRepository, In, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CategoryDTO {
  title: string;
}

interface TransactionCsvDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({ trim: true, columns: true });

    const parseCsv = transactionsReadStream.pipe(parsers);

    const transactions: Array<TransactionCsvDTO> = [];
    const categories: Array<CategoryDTO> = [];

    parseCsv.on('data', async tuple => {
      if (!tuple.title || !tuple.type || !tuple.value) return;
      categories.push({ title: tuple.category });
      transactions.push(tuple);
    });

    await new Promise(resolve => parseCsv.on('end', resolve));
    const categoriesRepository = getRepository(Category);
    const categoriesStored = await categoriesRepository.find({
      where: { title: In(categories.map(item => item.title)) },
    });

    const categoriesPersist = categories
      .filter(
        category =>
          !categoriesStored.map(item => item.title).includes(category.title),
      )
      .reduce((prevVal: CategoryDTO[], currentVal: CategoryDTO) => {
        return prevVal.findIndex(item => item.title === currentVal.title) > -1
          ? prevVal
          : [...prevVal, currentVal];
      }, []);

    await categoriesRepository.save(categoriesPersist);

    const transactionsPersist = transactions.map(item => {
      return {
        title: item.title,
        type: item.type,
        value: item.value,
        category: categoriesPersist.find(
          category => category.title === item.category,
        ),
      };
    });

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const result = await transactionsRepository.save(transactionsPersist);

    await fs.promises.unlink(filePath);

    return result;
  }
}

export default ImportTransactionsService;
