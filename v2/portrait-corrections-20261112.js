(() => {
  // Preserve the original image files; these corrections take precedence at render time.
  const corrections = {
    xiaoqingfang: { photo: 'portraits/verified-xiaoqingfang-20261112.jpg', photoSource: 'https://baike.baidu.com/item/肖清芳/12016135', photoLabel: '原剧角色画面' },
    xiaofeng: { photo: 'portraits/verified-xiaofeng-20261112.jpg', photoSource: 'https://baike.baidu.com/item/小凤/5885610', photoLabel: '原剧蒙面画面' },
    duer: { photo: 'portraits/verified-duer-20261112.jpg', photoSource: 'https://baike.baidu.com/item/杜二/65744850', photoLabel: '原剧角色画面' },
    zongzhu: { photo: 'portraits/verified-zongzhu-20261112.jpg', photoSource: 'https://baike.baidu.com/item/颖王元齐/8197366', photoLabel: '原剧角色画面', actor: '钱雁秋' },
    chachi: { photo: 'portraits/verified-chachi-20261112.jpg', photoSource: 'https://baike.baidu.com/item/差斥/9585980', photoLabel: '原剧角色画面' }
  };
  for (const [id, changes] of Object.entries(corrections)) {
    const person = window.ARCHIVE.people.find(item => item.id === id);
    if (person) Object.assign(person, changes);
  }
})();
