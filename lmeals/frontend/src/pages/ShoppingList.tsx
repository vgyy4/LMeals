import { useState } from 'react';
import { getShoppingList } from '../lib/api';
import moment from 'moment';
import { CheckSquare, Square, ShoppingCart, RefreshCw } from 'lucide-react';
import DatePicker from '../components/DatePicker';

const ShoppingListPage = () => {
    const [startDate, setStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('week').format('YYYY-MM-DD'));
    const [shoppingList, setShoppingList] = useState<string[]>([]);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const handleGenerateList = async () => {
        setLoading(true);
        try {
            const list = await getShoppingList(startDate, endDate);
            setShoppingList(list);
            setCheckedItems(new Set());
        } catch (error) {
            console.error("Failed to generate shopping list:", error);
        } finally {
            setLoading(false);
        }
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
        <div className="p-4 md:p-8 lg:px-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-3">
                    <ShoppingCart className="text-rose-600" size={36} />
                    Shopping List
                </h1>

                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <DatePicker
                        startDate={startDate}
                        endDate={endDate}
                        onRangeChange={(start, end) => {
                            setStartDate(start);
                            setEndDate(end);
                        }}
                    />
                    <button
                        onClick={handleGenerateList}
                        disabled={loading}
                        className="bg-rose-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-rose-700 active:scale-95 transition-all w-full sm:w-auto shadow-lg shadow-rose-200 dark:shadow-rose-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : null}
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Your List</h2>
                    <ul className="space-y-2">
                        {shoppingList.map((item, index) => (
                            <li key={index} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors" onClick={() => handleItemToggle(item)}>
                                {checkedItems.has(item) ? <CheckSquare className="text-emerald-600 dark:text-emerald-500" /> : <Square className="text-slate-400" />}
                                <span className={`text-lg ${checkedItems.has(item) ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
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
