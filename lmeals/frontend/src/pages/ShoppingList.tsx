import { useState } from 'react';
import { getShoppingList } from '../lib/api';
import moment from 'moment';
import { CheckSquare, Square } from 'lucide-react';

const ShoppingListPage = () => {
    const [startDate, setStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('week').format('YYYY-MM-DD'));
    const [shoppingList, setShoppingList] = useState<string[]>([]);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const handleGenerateList = async () => {
        setLoading(true);
        const list = await getShoppingList(startDate, endDate);
        setShoppingList(list);
        setCheckedItems(new Set());
        setLoading(false);
    };

    const handleItemToggle = (item: string) => {
        const newCheckedItems = new Set(checkedItems);
        if (newCheckedItems.has(item)) {
            newCheckedItems.delete(item);
        } else {
            newCheckedItems.add(item);
        }
        setCheckedItems(newCheckedItems);
    };

    return (
        <div className="p-4 md:p-8 lg:px-12">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-8">Shopping List</h1>
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </div>
                    <button onClick={handleGenerateList} className="bg-soft-rose text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors self-end">
                        {loading ? 'Generating...' : 'Generate List'}
                    </button>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Your List</h2>
                    <ul className="space-y-2">
                        {shoppingList.map((item, index) => (
                            <li key={index} className="flex items-center gap-3 cursor-pointer" onClick={() => handleItemToggle(item)}>
                                {checkedItems.has(item) ? <CheckSquare className="text-sage-green" /> : <Square className="text-gray-400" />}
                                <span className={`text-gray-800 ${checkedItems.has(item) ? 'line-through text-gray-500' : ''}`}>
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ShoppingListPage;
