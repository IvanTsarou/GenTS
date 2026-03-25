import type { TravelStory } from '@/lib/types/travel-story';

export const mockTravelStory: TravelStory = {
  id: 'japan-spring-2024',
  title: 'Весенняя Япония',
  coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80',
  startDate: '2024-03-20',
  endDate: '2024-03-28',
  countries: ['Япония'],
  totalLocations: 8,
  createdAt: '2024-03-29T10:00:00Z',
  updatedAt: '2024-03-29T10:00:00Z',
  days: [
    {
      id: 'day-1',
      date: '2024-03-20',
      dayNumber: 1,
      locations: [
        {
          id: 'loc-1',
          name: 'Токио, Синдзюку',
          description: 'Синдзюку — один из 23 специальных районов Токио, крупнейший транспортный узел Японии. Здесь расположен самый загруженный железнодорожный вокзал в мире.',
          coordinates: { lat: 35.6896, lng: 139.6921 },
          address: 'Shinjuku, Tokyo, Japan',
          arrivalTime: '14:00',
          media: [
            {
              id: 'media-1',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
              caption: 'Первые впечатления от Токио',
              timestamp: '2024-03-20T14:30:00Z',
              order: 0
            },
            {
              id: 'media-2',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
              caption: 'Небоскребы Синдзюку',
              timestamp: '2024-03-20T15:00:00Z',
              order: 1
            },
            {
              id: 'media-3',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&q=80',
              caption: 'Улицы вечернего Токио',
              timestamp: '2024-03-20T19:00:00Z',
              order: 2
            }
          ],
          comments: [
            {
              id: 'comment-1',
              text: 'Наконец-то добрались! Токио встретил нас невероятной энергией',
              author: 'Алекс',
              timestamp: '2024-03-20T14:35:00Z'
            }
          ],
          sourceDescription: 'Wikipedia',
          sourceUrl: 'https://en.wikipedia.org/wiki/Shinjuku'
        },
        {
          id: 'loc-2',
          name: 'Сибуя',
          description: 'Сибуя — знаменитый район Токио, известный своим перекрёстком, который является самым оживлённым пешеходным перекрёстком в мире.',
          coordinates: { lat: 35.6580, lng: 139.7016 },
          address: 'Shibuya, Tokyo, Japan',
          arrivalTime: '18:00',
          transportFrom: {
            type: 'metro',
            duration: '15 мин',
            details: 'JR Yamanote Line'
          },
          media: [
            {
              id: 'media-4',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80',
              caption: 'Легендарный перекресток Сибуя',
              timestamp: '2024-03-20T18:30:00Z',
              order: 0
            },
            {
              id: 'media-5',
              type: 'video_note',
              url: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=400&q=80',
              caption: 'Толпа на перекрестке',
              timestamp: '2024-03-20T18:45:00Z',
              order: 1
            }
          ],
          comments: [
            {
              id: 'comment-2',
              text: 'Это нужно видеть вживую! Тысячи людей одновременно',
              author: 'Мария',
              timestamp: '2024-03-20T18:50:00Z'
            }
          ]
        }
      ]
    },
    {
      id: 'day-2',
      date: '2024-03-21',
      dayNumber: 2,
      locations: [
        {
          id: 'loc-3',
          name: 'Храм Сэнсо-дзи',
          description: 'Сэнсо-дзи — древнейший буддийский храм Токио, основанный в 645 году. Расположен в районе Асакуса и является одной из главных достопримечательностей города.',
          coordinates: { lat: 35.7148, lng: 139.7967 },
          address: 'Asakusa, Taito City, Tokyo',
          arrivalTime: '09:00',
          transportFrom: {
            type: 'taxi',
            duration: '25 мин',
            distance: '8 км'
          },
          media: [
            {
              id: 'media-6',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80',
              caption: 'Ворота Каминаримон',
              timestamp: '2024-03-21T09:15:00Z',
              order: 0
            },
            {
              id: 'media-7',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
              caption: 'Главный зал храма',
              timestamp: '2024-03-21T10:00:00Z',
              order: 1
            },
            {
              id: 'media-8',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80',
              caption: 'Традиционная улица Накамисэ',
              timestamp: '2024-03-21T10:30:00Z',
              order: 2
            },
            {
              id: 'media-9',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80',
              caption: 'Детали храма',
              timestamp: '2024-03-21T11:00:00Z',
              order: 3
            }
          ],
          comments: [
            {
              id: 'comment-3',
              text: 'Невероятная атмосфера! Запах благовоний и звон колоколов',
              author: 'Алекс',
              timestamp: '2024-03-21T09:30:00Z'
            },
            {
              id: 'comment-4',
              text: 'Купили традиционные сладости на Накамисэ',
              author: 'Мария',
              timestamp: '2024-03-21T10:45:00Z'
            }
          ]
        },
        {
          id: 'loc-4',
          name: 'Токийская башня',
          description: 'Токийская телебашня высотой 333 метра, вдохновлённая Эйфелевой башней. Символ послевоенного возрождения Японии.',
          coordinates: { lat: 35.6586, lng: 139.7454 },
          address: 'Minato City, Tokyo',
          arrivalTime: '16:00',
          transportFrom: {
            type: 'metro',
            duration: '40 мин',
            details: 'Ginza Line + Oedo Line'
          },
          media: [
            {
              id: 'media-10',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
              caption: 'Токийская башня на закате',
              timestamp: '2024-03-21T17:30:00Z',
              order: 0
            }
          ],
          comments: []
        }
      ]
    },
    {
      id: 'day-3',
      date: '2024-03-22',
      dayNumber: 3,
      locations: [
        {
          id: 'loc-5',
          name: 'Киото',
          description: 'Киото — древняя столица Японии, город тысячи храмов. Здесь сохранилось более 2000 храмов и святилищ, 17 из которых включены в список Всемирного наследия ЮНЕСКО.',
          coordinates: { lat: 35.0116, lng: 135.7681 },
          address: 'Kyoto, Japan',
          arrivalTime: '11:00',
          transportFrom: {
            type: 'train',
            duration: '2ч 15мин',
            distance: '476 км',
            details: 'Shinkansen Nozomi'
          },
          media: [
            {
              id: 'media-11',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
              caption: 'Прибытие в Киото',
              timestamp: '2024-03-22T11:00:00Z',
              order: 0
            },
            {
              id: 'media-12',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80',
              caption: 'Бамбуковая роща Арасияма',
              timestamp: '2024-03-22T14:00:00Z',
              order: 1
            },
            {
              id: 'media-13',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
              caption: 'Золотой павильон Кинкаку-дзи',
              timestamp: '2024-03-22T16:00:00Z',
              order: 2
            }
          ],
          comments: [
            {
              id: 'comment-5',
              text: 'Синкансен — это что-то невероятное! 300 км/ч и полная тишина',
              author: 'Алекс',
              timestamp: '2024-03-22T10:00:00Z'
            },
            {
              id: 'comment-6',
              text: 'Киото совсем другой по энергетике. Спокойный, умиротворяющий',
              author: 'Мария',
              timestamp: '2024-03-22T15:00:00Z'
            }
          ]
        }
      ]
    },
    {
      id: 'day-4',
      date: '2024-03-23',
      dayNumber: 4,
      locations: [
        {
          id: 'loc-6',
          name: 'Фусими Инари',
          description: 'Фусими Инари-тайся — главное синтоистское святилище, посвящённое богу риса Инари. Знаменито тысячами красных ворот тории, образующих туннели на склоне горы.',
          coordinates: { lat: 34.9671, lng: 135.7727 },
          address: 'Fushimi Ward, Kyoto',
          arrivalTime: '06:00',
          transportFrom: {
            type: 'train',
            duration: '10 мин',
            details: 'JR Nara Line'
          },
          media: [
            {
              id: 'media-14',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80',
              caption: 'Тысячи красных тории',
              timestamp: '2024-03-23T06:30:00Z',
              order: 0
            },
            {
              id: 'media-15',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=800&q=80',
              caption: 'Рассвет у святилища',
              timestamp: '2024-03-23T06:15:00Z',
              order: 1
            },
            {
              id: 'media-16',
              type: 'video_note',
              url: 'https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=800&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=400&q=80',
              caption: 'Прогулка сквозь тории',
              timestamp: '2024-03-23T07:00:00Z',
              order: 2
            }
          ],
          comments: [
            {
              id: 'comment-7',
              text: 'Встали в 5 утра чтобы застать рассвет без толп. Оно того стоило!',
              author: 'Алекс',
              timestamp: '2024-03-23T06:20:00Z'
            }
          ]
        },
        {
          id: 'loc-7',
          name: 'Нара',
          description: 'Нара — первая постоянная столица Японии (710-784). Знаменита парком с сотнями свободно гуляющих оленей, которые считаются священными посланниками богов.',
          coordinates: { lat: 34.6851, lng: 135.8048 },
          address: 'Nara, Japan',
          arrivalTime: '13:00',
          transportFrom: {
            type: 'train',
            duration: '45 мин',
            details: 'JR Nara Line'
          },
          media: [
            {
              id: 'media-17',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
              caption: 'Олени Нары',
              timestamp: '2024-03-23T13:30:00Z',
              order: 0
            },
            {
              id: 'media-18',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
              caption: 'Храм Тодай-дзи',
              timestamp: '2024-03-23T15:00:00Z',
              order: 1
            }
          ],
          comments: [
            {
              id: 'comment-8',
              text: 'Олени кланяются за еду! Самые вежливые животные',
              author: 'Мария',
              timestamp: '2024-03-23T14:00:00Z'
            }
          ]
        }
      ]
    },
    {
      id: 'day-5',
      date: '2024-03-24',
      dayNumber: 5,
      locations: [
        {
          id: 'loc-8',
          name: 'Осака',
          description: 'Осака — третий по величине город Японии, известный своей уличной едой, ночной жизнью и дружелюбными жителями. Гастрономическая столица страны.',
          coordinates: { lat: 34.6937, lng: 135.5023 },
          address: 'Osaka, Japan',
          arrivalTime: '10:00',
          transportFrom: {
            type: 'train',
            duration: '50 мин',
            details: 'JR Special Rapid'
          },
          media: [
            {
              id: 'media-19',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
              caption: 'Дотонбори — сердце Осаки',
              timestamp: '2024-03-24T19:00:00Z',
              order: 0
            },
            {
              id: 'media-20',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&q=80',
              caption: 'Неоновые вывески',
              timestamp: '2024-03-24T20:00:00Z',
              order: 1
            },
            {
              id: 'media-21',
              type: 'photo',
              url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
              caption: 'Такояки — местный деликатес',
              timestamp: '2024-03-24T20:30:00Z',
              order: 2
            }
          ],
          comments: [
            {
              id: 'comment-9',
              text: 'Осака = еда! Такояки, окономияки, кушикацу... Не можем остановиться',
              author: 'Алекс',
              timestamp: '2024-03-24T21:00:00Z'
            },
            {
              id: 'comment-10',
              text: 'Местные такие открытые и веселые, совсем другая атмосфера',
              author: 'Мария',
              timestamp: '2024-03-24T22:00:00Z'
            }
          ]
        }
      ]
    }
  ]
}
