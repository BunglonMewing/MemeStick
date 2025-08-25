// Initialize Lucide icons
lucide.createIcons();

// Supabase Client
const SUPABASE_URL = 'https://vnxcrssjnrncgdwysrle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueGNyc3NqbnJuY2dkd3lzcmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTg0NjcsImV4cCI6MjA3MTA5NDQ2N30.9YjBtU07-957KntkR7aZfekLpX12VviUw-aw6nt4Wc0';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch stickers from Supabase
async function fetchStickers() {
    const { data, error } = await supabase
        .from('stickers')
        .select('*');

    if (error) {
        console.error('Error fetching stickers:', error);
        return [];
    }
    return data;
}

async function searchStickers(query) {
    const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .ilike('name', `%${query}%`);

    if (error) {
        console.error('Error searching stickers:', error);
        return [];
    }
    return data;
}

// Generate sticker grid
function generateStickerGrid(data) {
    const grid = document.getElementById('sticker-grid');
    grid.innerHTML = '';

    data.forEach(sticker => {
        const stickerCard = document.createElement('div');
        stickerCard.className = 'sticker-card rounded-2xl p-4 cursor-pointer group';
        stickerCard.innerHTML = `
            <div class="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                ${sticker.trending ? '<div class="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">🔥</div>' : ''}
                <img src="${sticker.image_url}" alt="${sticker.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
            </div>
            <div class="text-center">
                <h3 class="font-semibold text-gray-800 mb-1">${sticker.name}</h3>
                <p class="text-sm text-gray-500 mb-2" id="downloads-${sticker.id}">${sticker.downloads.toLocaleString()} downloads</p>
                <button class="download-btn w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105" data-id="${sticker.id}" data-url="${sticker.image_url}" data-name="${sticker.name}">
                    <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                    Download
                </button>
            </div>
        `;
        grid.appendChild(stickerCard);
    });
    lucide.createIcons(); // Re-initialize icons for newly added buttons
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    const stickers = await fetchStickers();
    generateStickerGrid(stickers);

    // Category filter logic
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all buttons
            categoryButtons.forEach(btn => btn.classList.remove('category-active'));
            // Activate clicked button
            button.classList.add('category-active');

            const category = button.dataset.category;
            if (category === 'all') {
                generateStickerGrid(stickers);
            } else if (category === 'trending') {
                const trendingStickers = stickers.filter(s => s.trending);
                generateStickerGrid(trendingStickers);
            } else {
                const filteredStickers = stickers.filter(s => s.category === category);
                generateStickerGrid(filteredStickers);
            }
        });
    });

    // Search logic
    const searchInput = document.getElementById('search-input');
    const searchButton = document.querySelector('#home button');

    async function performSearch() {
        const query = searchInput.value;
        if (query.trim() === '') {
            const allStickers = await fetchStickers();
            generateStickerGrid(allStickers);
        } else {
            const searchResult = await searchStickers(query);
            generateStickerGrid(searchResult);
        }
    }

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    mobileMenuButton.addEventListener('click', () => {
        mobileMenuOverlay.classList.remove('hidden');
    });

    closeMobileMenuButton.addEventListener('click', () => {
        mobileMenuOverlay.classList.add('hidden');
    });

    mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === mobileMenuOverlay) {
            mobileMenuOverlay.classList.add('hidden');
        }
    });

    // File upload logic
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-purple-400');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-purple-400');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-purple-400');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            // Handle file upload here
            console.log('File dropped:', files[0]);
        }
    });

    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            console.log('File selected:', file);
            await uploadSticker(file);
        }
    });
});

async function uploadSticker(file) {
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(fileName, file);

    if (uploadError) {
        console.error('Error uploading sticker:', uploadError);
        alert('Gagal mengunggah stiker.');
        return;
    }

    console.log('File uploaded successfully.');

    const { data: publicUrlData } = supabase.storage
        .from('stickers')
        .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabase
        .from('stickers')
        .insert([
            {
                name: 'Sticker Baru',
                category: 'lucu',
                image_url: publicUrl,
                downloads: 0,
                trending: false
            }
        ]);

    if (dbError) {
        console.error('Error saving sticker to database:', dbError);
        alert('Gagal menyimpan stiker ke database.');
        return;
    }

    alert('Stiker berhasil diunggah!');
    const allStickers = await fetchStickers();
    generateStickerGrid(allStickers);
}

// --- Download Logic ---
async function downloadSticker(url, name) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileExtension = url.split('.').pop();
        link.download = `${name.replace(/ /g, '_')}.${fileExtension}` || 'sticker.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Gagal mengunduh stiker. Coba klik kanan dan "Save Image As...".');
    }
}

async function incrementDownloadCount(stickerId) {
    const { data, error: fetchError } = await supabase
        .from('stickers')
        .select('downloads')
        .eq('id', stickerId)
        .single();

    if (fetchError) {
        console.error('Error fetching sticker for download count:', fetchError);
        return;
    }

    const newCount = data.downloads + 1;
    const { error: updateError } = await supabase
        .from('stickers')
        .update({ downloads: newCount })
        .eq('id', stickerId);

    if (updateError) {
        console.error('Error updating download count:', updateError);
    } else {
        const downloadCountElement = document.getElementById(`downloads-${stickerId}`);
        if (downloadCountElement) {
            downloadCountElement.textContent = `${newCount.toLocaleString()} downloads`;
        }
    }
}

document.getElementById('sticker-grid').addEventListener('click', async (e) => {
    const downloadButton = e.target.closest('.download-btn');
    if (downloadButton) {
        e.preventDefault();
        const { id, url, name } = downloadButton.dataset;

        await incrementDownloadCount(id);
        await downloadSticker(url, name);
    }
});
